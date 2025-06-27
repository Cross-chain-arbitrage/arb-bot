import {
	Address,
	getAddress,
	getContract,
	isAddress,
	isAddressEqual,
} from 'viem'
import { ERC20_ABI } from '../../abi/erc20'
import { ClientManager } from '../../utils/ClientManager'
import {
	NATIVE_ADDRESS,
	NativeCurrency,
	STARGATE_NATIVE_ADDRESS,
} from './NativeCurrency'
import { Token } from './Token'
import { WrappedNative, wrappedTokens } from './WrappedNative'
import { NATIVE_CURRENCIES } from './nativeCurrencies'

type TokenCacheKey = `${number}:${Address}`

export class TokenUtils {
	/* ======== STATE ======== */

	private static tokenCache: Map<TokenCacheKey, Token | NativeCurrency> =
		new Map()

	/* ======== PUBLIC ======== */

	static async getWrappedNative(chainId: number): Promise<WrappedNative> {
		const wrappedToken = wrappedTokens[chainId]

		if (!wrappedToken) {
			throw new Error(`Wrapped Native not found for chain ${chainId}`)
		}

		return this.fromAddress<WrappedNative>(wrappedToken, chainId)
	}

	static async fromAddress<T extends Token | NativeCurrency | WrappedNative>(
		address: Address,
		chainId: number,
	): Promise<T> {
		const checksumAddress = getAddress(address)
		const cacheKey = this.getCacheKey(checksumAddress, chainId)
		const cachedToken = this.tokenCache.get(cacheKey)

		if (cachedToken) {
			return cachedToken as T
		}

		const wallet = ClientManager.getWalletClient(chainId)
		const abi = ERC20_ABI

		if (this.isNative(checksumAddress)) {
			const token = this._createNative(chainId)

			this.tokenCache.set(
				this.getCacheKey(NATIVE_ADDRESS, chainId),
				token,
			)

			return token as T
		}

		const contract = getContract({
			address: checksumAddress,
			abi,
			client: wallet,
		})

		const [decimals, name, symbol] = await Promise.all([
			contract.read.decimals(),
			contract.read.name(),
			contract.read.symbol(),
		])

		let token: T

		if (this.isWrappedNative(checksumAddress, chainId)) {
			token = new WrappedNative(chainId, symbol, decimals, name) as T
		} else {
			token = new Token(
				checksumAddress,
				chainId,
				symbol,
				decimals,
				name,
			) as T
		}

		this.tokenCache.set(cacheKey, token)

		return token
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

	/* ======== CHECKERS ======== */

	static isNative(address: Address): boolean {
		return (
			isAddressEqual(address, NATIVE_ADDRESS) ||
			isAddressEqual(address, STARGATE_NATIVE_ADDRESS)
		)
	}

	static isWrappedNative(address: Address, chainId: number): boolean {
		const wrappedToken = wrappedTokens[chainId]

		if (!wrappedToken) {
			return false
		}

		return isAddressEqual(address, wrappedToken)
	}

	static isToken(address: Address): boolean {
		return !this.isNative(address)
	}

	/* ======== INTERNAL ======== */

	private static getCacheKey(
		address: Address,
		chainId: number,
	): TokenCacheKey {
		return `${chainId}:${address.toLowerCase() as Address}`
	}

	private static _createNative(chainId: number): NativeCurrency {
		return (
			NATIVE_CURRENCIES[chainId] ??
			new NativeCurrency(chainId, 'ETH', 'ETH')
		)
	}
}
