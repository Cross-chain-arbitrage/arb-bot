import { Address } from 'viem'
import { ERC20_ABI } from '../../abi/erc20'
import { ClientManager } from '../../utils/ClientManager'
import {
	NATIVE_ADDRESS,
	NativeCurrency,
	STARGATE_NATIVE_ADDRESS,
} from './NativeCurrency'
import { Token } from './Token'

type TokenCacheKey = `${number}:${Address}`

export class TokenUtils {
	/* ======== STATE ======== */

	private static tokenCache: Map<TokenCacheKey, Token | NativeCurrency> =
		new Map()

	/* ======== INTERNAL ======== */

	private static getCacheKey(
		address: Address,
		chainId: number,
	): TokenCacheKey {
		return `${chainId}:${address.toLowerCase() as Address}`
	}

	static isNative(address: Address): boolean {
		return address === NATIVE_ADDRESS || address === STARGATE_NATIVE_ADDRESS
	}

	static isToken(address: Address): boolean {
		return !this.isNative(address)
	}

	static async fromAddress<T extends Token | NativeCurrency>(
		address: Address,
		chainId: number,
	): Promise<T> {
		const cacheKey = this.getCacheKey(address, chainId)
		const cachedToken = this.tokenCache.get(cacheKey)

		if (cachedToken) {
			return cachedToken as T
		}

		const client = ClientManager.getClient(chainId)
		const abi = ERC20_ABI

		if (this.isNative(address)) {
			const token = this._createNative(chainId)

			this.tokenCache.set(
				this.getCacheKey(NATIVE_ADDRESS, chainId),
				token,
			)

			return token as T
		}

		const [decimals, name, symbol] = await Promise.all([
			client.readContract({
				address,
				abi,
				functionName: 'decimals',
			}),
			client.readContract({
				address,
				abi,
				functionName: 'name',
			}),
			client.readContract({
				address,
				abi,
				functionName: 'symbol',
			}),
		])

		const token = new Token(address, chainId, symbol, decimals, name)
		this.tokenCache.set(cacheKey, token)
		return token as T
	}

	private static _createNative(chainId: number): NativeCurrency {
		return new NativeCurrency(chainId, 'ETH', 'ETH')
	}

	static getNative(chainId: number): NativeCurrency {
		const cacheKey = this.getCacheKey(NATIVE_ADDRESS, chainId)
		const cachedToken = this.tokenCache.get(cacheKey)

		if (cachedToken) {
			return cachedToken as NativeCurrency
		}

		const token = this._createNative(chainId)
		this.tokenCache.set(cacheKey, token)
		return token
	}
}
