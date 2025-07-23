import TTLCache from '@isaacs/ttlcache'
import { Address, parseEther, zeroHash } from 'viem'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { ClientManager } from '../../utils/ClientManager'
import { createCustomError } from '../../utils/common'
import { GasZipBridgeTx } from './GasZipBridgeTx'

// TODO: Replace with actual GasZip Calldata API endpoint
const GASZIP_API_URL = 'https://backend.gas.zip/v2'

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
	speed: number
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
	gas: string // gas usage of a simple transfer
	gwei: string // current gas price
	bal: string // balance of the Gas.zip reloader
	rpcs: string[]
	symbol: string // Native symbol
	price: number // Native price in USD
}

// const GAS_ZIP_EXECUTOR_ADDRESS = '0x90E595783E43eb89fF07f63d27B8430e6B44bD9c'

export class GasZipBridge {
	static chainsCache: TTLCache<string, GasZipChain[]> = new TTLCache({
		ttl: 1000 * 60 * 5, // 5 min
	})

	static customError = createCustomError('GasZipBridgeError')

	/**
	 * Get calldata and fee for a bridge operation
	 * @param tokenIn Source token (must be native)
	 * @param dstChainId Destination chain ID (GasZip internal ID)
	 * @param amount Amount in wei
	 * @param recipient Recipient address on destination chain
	 * @returns { calldata: string, fee: bigint, rawResult: unknown }
	 */
	static async quote(
		tokenIn: NativeCurrency,
		dstChainId: number,
		amount: bigint,
		recipient: Address,
	): Promise<GasZipQuote> {
		const isSourceSupported = await this.isChainSupported(tokenIn.chainId)
		const isDestinationSupported = await this.isChainSupported(dstChainId)

		if (!isSourceSupported) {
			throw new this.customError(
				`Source chain ${tokenIn.chainId} is not supported`,
			)
		}

		if (!isDestinationSupported) {
			throw new this.customError(
				`Destination chain ${dstChainId} is not supported`,
			)
		}

		if (amount < parseEther('0.00001')) {
			throw new this.customError(`Amount ${amount} is too small`)
		}

		if (amount >= parseEther('0.375')) {
			throw new this.customError(`Amount ${amount} is too big`)
		}

		// if (amount > this.getBridgeLimit(dstChainId)) {
		// 	throw new this.customError(
		// 		`Amount ${amount} is too big, bridge limit is ${this.getBridgeLimit(dstChainId)}`,
		// 	)
		// }

		try {
			const response = await fetch(
				`${GASZIP_API_URL}/quotes/${tokenIn.chainId}/${amount.toString()}/${dstChainId}`,
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

			if (data.quotes.length > 1) {
				throw new this.customError(
					`Multiple quotes found for ${tokenIn.chainId} -> ${dstChainId}`,
				)
			}

			if (data.quotes[0].error) {
				if (data.quotes[0].error.includes('Cannot fulfill')) {
					throw new this.customError(
						`Amount ${amount} is too big and cannot be fulfilled right now}`,
					)
				}

				throw new this.customError(data.quotes[0].error)
			}

			return data.quotes[0]
		} catch (error) {
			throw new this.customError(error as string)
		}
	}

	static async getChains() {
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
	static async bridge(
		tokenIn: Token | NativeCurrency,
		tokenOut: Token | NativeCurrency,
		amountIn: bigint,
		slippage: bigint = 10n,
	): Promise<GasZipBridgeTx> {
		const isSourceSupported = await this.isChainSupported(tokenIn.chainId)
		const isDestinationSupported = await this.isChainSupported(
			tokenOut.chainId,
		)
		const dstChainId = tokenOut.chainId
		const wallet = ClientManager.getWalletClient(tokenIn.chainId)
		const account = wallet.account.address

		if (!isSourceSupported) {
			throw new this.customError(
				`Source chain ${tokenIn.chainId} is not supported`,
			)
		}

		if (!isDestinationSupported) {
			throw new this.customError(
				`Destination chain ${dstChainId} is not supported`,
			)
		}

		if (!tokenOut.isNative()) {
			throw new this.customError(
				`Destination token ${tokenOut.chainId} is not native`,
			)
		}

		if (amountIn < parseEther('0.00001')) {
			throw new this.customError(`Amount ${amountIn} is too small`)
		}

		if (amountIn >= parseEther('0.375')) {
			throw new this.customError(`Amount ${amountIn} is too big`)
		}

		try {
			const response = await fetch(
				`${GASZIP_API_URL}/quotes/${tokenIn.chainId}/${amountIn.toString()}/${dstChainId}?to=${account}&from=${account}`,
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

			if (data.quotes.length > 1) {
				throw new this.customError(
					`Multiple quotes found for ${tokenIn.chainId} -> ${dstChainId}`,
				)
			}

			if (data.quotes[0].error) {
				if (data.quotes[0].error.includes('Cannot fulfill')) {
					throw new this.customError(
						`Amount ${amountIn} is too big and cannot be fulfilled right now}`,
					)
				}

				throw new this.customError(data.quotes[0].error)
			}

			return new GasZipBridgeTx(zeroHash, tokenIn, tokenOut, amountIn)
		} catch (error) {
			throw new this.customError(error as string)
		}
	}

	static async isChainSupported(chainId: number): Promise<boolean> {
		const chains = await this.getChains()
		return chains.some((chain) => chain.chain === chainId)
	}
}
