import TTLCache from '@isaacs/ttlcache'
import { Address, Hash, parseEther } from 'viem'
import { getChainEIdByNativeChainId } from '../../dataApi/layerzeroscan/utils'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { ClientManager } from '../../utils/ClientManager'
import { createCustomError } from '../../utils/common'
import { GasZipLimitAbi } from './limitAbi'

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

const GAS_ZIP_EXECUTOR_ADDRESS = '0x90E595783E43eb89fF07f63d27B8430e6B44bD9c'

export class GasZipBridge {
	static chainsCache: TTLCache<string, GasZipChain[]> = new TTLCache({
		ttl: 1000 * 60 * 30, // 30 min
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

		if (amount >= parseEther('1000')) {
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

	static async getBridgeLimit(chainId: number) {
		const lzId = getChainEIdByNativeChainId(chainId)
		const client = ClientManager.getClient(chainId)

		const config = (await client.readContract({
			address: GAS_ZIP_EXECUTOR_ADDRESS,
			abi: GasZipLimitAbi,
			functionName: 'dstConfig',
			args: [lzId],
		})) as bigint[]

		return config[3]
	}

	/**
	 * Send bridge transaction using calldata from quote()
	 * @param tokenIn Source token (must be native)
	 * @param calldata Calldata from quote()
	 * @param fee Fee from quote()
	 * @returns Transaction hash (Hash)
	 */
	static async bridge(
		tokenIn: NativeCurrency,
		calldata: string,
		fee: bigint,
	): Promise<Hash> {
		const walletClient = ClientManager.getWalletClient(tokenIn.chainId)
		try {
			// Send transaction to GasZip contract with calldata and fee
			// sendTransaction returns the transaction hash (not a TransactionReceipt)
			const txHash = await walletClient.sendTransaction({
				to: calldata.slice(0, 42) as Address, // first 42 chars is address
				data: calldata.slice(42) as `0x${string}`,
				value: fee,
				account: walletClient.account,
			})
			return txHash
		} catch (e) {
			throw new this.customError('Bridge failed: ' + (e as Error).message)
		}

		this.chainsCache.delete('chains')
	}

	static async isChainSupported(chainId: number): Promise<boolean> {
		const chains = await this.getChains()
		return chains.some((chain) => chain.chain === chainId)
	}
}
