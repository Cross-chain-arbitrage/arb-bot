import TTLCache from '@isaacs/ttlcache'
import { Injectable } from '@nestjs/common'
import { parseEther, zeroHash } from 'viem'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { ChainClientService } from '../../utils/ChainClientService'
import { createCustomError } from '../../utils/common'
import { GasZipBridgeTx } from './GasZipBridgeTx'

// TODO: Replace with actual GasZip Calldata API endpoint
export const GASZIP_API_URL = 'https://backend.gas.zip/v2'

export interface GasZipQuoteResponse {
	expires: number
	quotes: GasZipQuote[]
}

export interface GasZipQuote {
	chain: number
	decimals: number
	expected: bigint
	expectedNative: bigint
	gas: number
	speed: number // seconds to transaction confirmation?
	usd: number
	error?: string
}

interface GasZipChainsResponse {
	chains: GasZipChain[]
}

export interface GasZipChain {
	name: string
	chain: number // native chain id
	short: number // unique Gas.zip id
	gas: string // Actually this field represents some gas cost in wei, but it doesn't actually line up with any costs
	gwei: string // current gas price
	bal: string // balance of the Gas.zip reloader
	rpcs: string[]
	symbol: string // Native symbol
	price: number // Native price in USD
}

interface GasZipCalldataResponse {
	calldata: string // '0x01012f'
	expires: number // in seconds
	quotes: GasZipQuote[]
}

export const GAS_ZIP_DIRECT_DEPOSIT_ADDRESS =
	'0x391E7C679d29bD940d63be94AD22A25d25b5A604'

@Injectable()
export class GasZipBridge {
	BRIDGE_LIMIT_ETHER = parseEther('0.375')
	BRIDGE_SLIPPAGE_LIMIT_BPS = 75n // 0.75%
	TRANSFER_GAS_USAGE_WITH_8BYTES = 30000

	chainsCache: TTLCache<string, GasZipChain[]> = new TTLCache({
		ttl: 1000 * 60 * 1, // 5 min
	})

	constructor(private readonly chainClientService: ChainClientService) {}

	customError = createCustomError('GasZipBridgeError')

	/**
	 * Get calldata and fee for a bridge operation
	 * @param tokenIn Source token (must be native)
	 * @param dstChainId Destination chain ID (GasZip internal ID)
	 * @param amount Amount in wei
	 * @param recipient Recipient address on destination chain
	 * @returns { calldata: string, fee: bigint, rawResult: unknown }
	 */
	async quote(
		tokenIn: NativeCurrency,
		tokenOut: NativeCurrency,
		amount: bigint,
	): Promise<GasZipQuote> {
		const isSourceSupported = await this.isChainSupported(tokenIn.chainId)
		const isDestinationSupported = await this.isChainSupported(
			tokenOut.chainId,
		)

		if (!isSourceSupported) {
			throw new this.customError(
				`Source chain ${tokenIn.chainId} is not supported`,
			)
		}

		if (!isDestinationSupported) {
			throw new this.customError(
				`Destination chain ${tokenOut.chainId} is not supported`,
			)
		}

		if (amount < parseEther('0.00001')) {
			throw new this.customError(`Amount ${amount} is too small`)
		}

		if (amount >= this.getSecurityBridgeLimit(tokenIn, tokenOut)) {
			throw new this.customError(
				`Amount ${amount} exceeds manually set bridge limit`,
			)
		}

		// if (amount > this.getBridgeLimit(dstChainId)) {
		// 	throw new this.customError(
		// 		`Amount ${amount} is too big, bridge limit is ${this.getBridgeLimit(dstChainId)}`,
		// 	)
		// }

		// try {
		const response = await fetch(
			`${GASZIP_API_URL}/quotes/${tokenIn.chainId}/${amount.toString()}/${tokenOut.chainId}`,
			{
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			},
		)

		if (!response.ok) {
			throw new this.customError(
				'GasZip API error: ' + response.statusText,
			)
		}

		const data = (await response.json()) as GasZipQuoteResponse
		const quotes = data.quotes

		if (quotes.length > 1) {
			throw new this.customError(
				`Multiple quotes found for ${tokenIn.chainId} -> ${tokenOut.chainId}`,
			)
		}

		if (quotes[0].error) {
			if (quotes[0].error.includes('Cannot fulfill')) {
				throw new this.customError(
					`Amount ${amount} is too big and cannot be fulfilled right now}`,
				)
			}

			throw new this.customError(quotes[0].error)
		}

		// Fixed type mismatch
		quotes[0].expected = BigInt(quotes[0].expected)

		const amountOutMin =
			(amount * (10000n - this.BRIDGE_SLIPPAGE_LIMIT_BPS)) / 10000n

		if (BigInt(quotes[0].expected) < amountOutMin) {
			const actualSlippage =
				(Number(quotes[0].expected) / Number(amount) - 1) * -100

			throw new this.customError(
				`Quote expected ${quotes[0].expected} exceeds slippage of ${Number(this.BRIDGE_SLIPPAGE_LIMIT_BPS) / 100}% (actual slippage: ${actualSlippage.toFixed(
					3,
				)}%)`,
			)
		}

		// Actually this field represents some gas cost in wei, but it doesn't actually line up
		return { ...quotes[0], gas: this.TRANSFER_GAS_USAGE_WITH_8BYTES }
		// } catch (error) {
		// 	throw new this.customError(error as string)
		// }
	}

	async getChains() {
		const cachedChains = this.chainsCache.get('chains')

		if (cachedChains) {
			return cachedChains
		}

		const response = await fetch(`${GASZIP_API_URL}/chains`)
		const data = (await response.json()) as GasZipChainsResponse

		this.chainsCache.set('chains', data.chains)

		return data.chains
	}

	/**
	 * Send bridge transaction using calldata from quote()
	 * @param tokenIn Source token (must be native)
	 * @param calldata Calldata from quote()
	 * @param fee Fee from quote()
	 * @returns Transaction hash (Hash)
	 */
	async bridge(
		tokenIn: NativeCurrency,
		tokenOut: NativeCurrency,
		amountIn: bigint,
		simulateOnly: boolean = false,
	): Promise<GasZipBridgeTx> {
		// Called to validate params
		await this.quote(tokenIn, tokenOut, amountIn)
		const wallet = this.chainClientService.getWalletClient(tokenIn.chainId)
		const account = wallet.account.address

		try {
			const response = await fetch(
				`${GASZIP_API_URL}/quotes/${tokenIn.chainId}/${amountIn.toString()}/${tokenOut.chainId}?to=${account}&from=${account}`,
			)

			if (!response.ok) {
				throw new this.customError(
					'GasZip API error: ' + response.statusText,
				)
			}

			const data = (await response.json()) as GasZipCalldataResponse

			if (data.quotes.length > 1) {
				throw new this.customError(
					`Multiple quotes found for ${tokenIn.chainId} -> ${tokenOut.chainId}`,
				)
			}

			const quote = data.quotes[0]

			if (quote.error) {
				if (quote.error.includes('Cannot fulfill')) {
					throw new this.customError(
						`Amount ${amountIn} is too big and cannot be fulfilled right now}`,
					)
				}

				throw new this.customError(quote.error)
			}

			const balance = await tokenIn.balanceOf(account)

			if (balance < amountIn) {
				throw new this.customError(
					`Insufficient balance to bridge, requested: ${tokenIn.formatUnits(amountIn)} ${tokenIn.toString()}, has ${tokenIn.formatUnits(balance)} ${tokenIn.toString()}`,
				)
			}

			if (simulateOnly) {
				return new GasZipBridgeTx(
					this.chainClientService,
					zeroHash,
					tokenIn,
					tokenOut,
					amountIn,
				)
			}

			const hash = await wallet.sendTransaction({
				account: wallet.account,
				to: GAS_ZIP_DIRECT_DEPOSIT_ADDRESS,
				data: data.calldata as `0x${string}`,
				value: amountIn,
			})

			return new GasZipBridgeTx(
				this.chainClientService,
				hash,
				tokenIn,
				tokenOut,
				amountIn,
			)
		} catch (error) {
			throw new this.customError(error as string)
		}
	}

	getSecurityBridgeLimit(
		tokenIn: NativeCurrency,
		tokenOut: NativeCurrency,
	): bigint {
		if (tokenIn.symbol !== 'ETH' || tokenIn.decimals !== 18) {
			throw new this.customError(
				`Bridge from non ETH token is not supported`,
			)
		}

		if (tokenOut.symbol !== 'ETH' || tokenOut.decimals !== 18) {
			throw new this.customError(
				`Bridge to non ETH token is not supported`,
			)
		}

		return this.BRIDGE_LIMIT_ETHER
	}

	async isChainSupported(chainId: number): Promise<boolean> {
		const chains = await this.getChains()
		return chains.some((chain) => chain.chain === chainId)
	}
}
