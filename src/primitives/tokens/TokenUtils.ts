import { Injectable } from '@nestjs/common'
import {
	Address,
	getAddress,
	getContract,
	isAddress,
	isAddressEqual,
} from 'viem'
import { ERC20_ABI } from '../../abi/erc20'
import { ChainClientService } from '../../chain-client/chain-client.service'
import { ETH_METADATA, NATIVE_CURRENCIES } from './nativeCurrencies'
import {
	NATIVE_ADDRESS,
	NativeCurrency,
	STARGATE_NATIVE_ADDRESS,
} from './NativeCurrency'
import { Token } from './Token'
import { TokenMetadata } from './TokenBase'
import { WrappedNative, wrappedTokens } from './WrappedNative'

type TokenCacheKey = `${number}:${Address}`

@Injectable()
export class TokenUtils {
	constructor(private readonly chainClientService: ChainClientService) {}
	/* ======== STATE ======== */

	private tokenCache: Map<TokenCacheKey, Token | NativeCurrency> = new Map()

	/* ======== PUBLIC ======== */

	async getWrappedNative(chainId: number): Promise<WrappedNative> {
		const wrappedToken = wrappedTokens[chainId]

		if (!wrappedToken) {
			throw new Error(`Wrapped Native not found for chain ${chainId}`)
		}

		return this.fromAddress<WrappedNative>(wrappedToken, chainId)
	}

	async fromAddress<T extends Token | NativeCurrency | WrappedNative>(
		address: Address,
		chainId: number,
	): Promise<T> {
		const checksumAddress = getAddress(address)
		const cacheKey = this.getCacheKey(checksumAddress, chainId)
		const cachedToken = this.tokenCache.get(cacheKey)

		if (cachedToken) {
			return cachedToken as T
		}

		const client = this.chainClientService.getClient(chainId)
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
			client,
		})

		const [decimals, name, symbol] = await Promise.all([
			contract.read.decimals(),
			contract.read.name(),
			contract.read.symbol(),
		])

		let token: T

		const metadata: TokenMetadata = {
			symbol,
			name,
			decimals,
		}

		if (this.isWrappedNative(checksumAddress, chainId)) {
			token = new WrappedNative(
				this.chainClientService,
				this.getNative(chainId),
				chainId,
				metadata,
			) as T
		} else {
			token = new Token(
				this.chainClientService,
				checksumAddress,
				chainId,
				metadata,
			) as T
		}

		this.tokenCache.set(cacheKey, token)

		return token
	}

	getNative(chainId: number): NativeCurrency {
		const cacheKey = this.getCacheKey(NATIVE_ADDRESS, chainId)
		const cachedToken = this.tokenCache.get(cacheKey)

		if (cachedToken) {
			return cachedToken as NativeCurrency
		}

		const token = this._createNative(chainId)

		this.tokenCache.set(cacheKey, token)

		return token
	}

	isValidTokenId(id: string) {
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

	async fromId(id: TokenId): Promise<Token | NativeCurrency | WrappedNative> {
		const isValid = this.isValidTokenId(id)

		if (!isValid) {
			throw new Error('Invalid token id')
		}

		const [chainId, addr] = id.split(':')

		return await this.fromAddress(addr as Address, Number(chainId))
	}

	/* ======== CHECKERS ======== */

	isNative(address: Address): boolean {
		return (
			isAddressEqual(address, NATIVE_ADDRESS) ||
			isAddressEqual(address, STARGATE_NATIVE_ADDRESS)
		)
	}

	isWrappedNative(address: Address, chainId: number): boolean {
		const wrappedToken = wrappedTokens[chainId]

		if (!wrappedToken) {
			return false
		}

		return isAddressEqual(address, wrappedToken)
	}

	isToken(address: Address): boolean {
		return !this.isNative(address)
	}

	/* ======== INTERNAL ======== */

	private getCacheKey(address: Address, chainId: number): TokenCacheKey {
		return `${chainId}:${address.toLowerCase() as Address}`
	}

	private _createNative(chainId: number): NativeCurrency {
		const metadata = NATIVE_CURRENCIES[chainId] ?? ETH_METADATA

		return new NativeCurrency(this.chainClientService, chainId, metadata)
	}
}
