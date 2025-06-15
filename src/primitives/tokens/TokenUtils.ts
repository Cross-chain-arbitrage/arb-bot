import { Address, isAddress } from 'viem'
import { ERC20_ABI } from '../../abi/erc20'
import { ClientManager } from '../../utils/ClientManager'
import { isSameAddress } from '../../utils/common'
import {
	NATIVE_ADDRESS,
	NativeCurrency,
	STARGATE_NATIVE_ADDRESS,
} from './NativeCurrency'
import { Token } from './Token'
import { TokenId } from './TokenBase'
import { WrappedNative, wrappedTokens } from './WrappedNative'

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
		return (
			isSameAddress(address, NATIVE_ADDRESS) ||
			isSameAddress(address, STARGATE_NATIVE_ADDRESS)
		)
	}

	static isWrappedNative(address: Address, chainId: number): boolean {
		const wrappedToken = wrappedTokens[chainId]

		if (!wrappedToken) {
			return false
		}

		return isSameAddress(address, wrappedToken)
	}

	static isToken(address: Address): boolean {
		return !this.isNative(address)
	}

	static getWrappedNative(chainId: number): WrappedNative {
		const wrappedToken = wrappedTokens[chainId]

		if (!wrappedToken) {
			throw new Error(`Wrapped Native not found for chain ${chainId}`)
		}

		const cachedToken = this.tokenCache.get(
			this.getCacheKey(wrappedToken, chainId),
		)

		if (cachedToken) {
			return cachedToken as WrappedNative
		}

		const token = new WrappedNative(
			chainId,
			wrappedToken,
			18,
			'Wrapped Native',
		)

		this.tokenCache.set(this.getCacheKey(wrappedToken, chainId), token)

		return token
	}

	static async fromAddress<T extends Token | NativeCurrency | WrappedNative>(
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

		let token: T

		if (this.isWrappedNative(address, chainId)) {
			token = new WrappedNative(chainId, symbol, decimals, name) as T
		} else {
			token = new Token(address, chainId, symbol, decimals, name) as T
		}

		this.tokenCache.set(cacheKey, token)

		return token
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

	static isValidTokenId(id: string) {
		try {
			const [chainId, addr] = id.split(':')

			if (!chainId || !addr) {
				return false
			}

			if (!isAddress(addr)) {
				return false
			}

			if (Number(chainId) <= 0) {
				return false
			}

			return true
		} catch (error) {
			return false
		}
	}

	static async fromId(
		id: TokenId,
	): Promise<Token | NativeCurrency | WrappedNative> {
		const isValid = this.isValidTokenId(id)

		if (!isValid) {
			throw new Error('Invalid token id')
		}

		const [chainId, addr] = id.split(':')

		return await this.fromAddress(addr as Address, Number(chainId))
	}
}
