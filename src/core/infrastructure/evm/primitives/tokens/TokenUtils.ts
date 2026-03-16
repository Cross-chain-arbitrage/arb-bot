import { Injectable } from '@nestjs/common'
import {
	Address,
	decodeFunctionResult,
	encodeFunctionData,
	getAddress,
	getContract,
	isAddress,
	isAddressEqual,
	trim,
} from 'viem'
import { TokenMetadata } from '../../../../domain/entities/token'
import { TokenId } from '../../../../domain/value-objects/token-id'
import { ERC20_ABI } from '../../abi/erc20'
import { ChainClientService } from '../../chain-client/chain-client.service'
import { TokenApiService } from '../../token-api.ts/token-api.service'
import { ETH_METADATA, NATIVE_CURRENCIES } from './nativeCurrencies'
import {
	NATIVE_ADDRESS,
	NativeCurrency,
	STARGATE_NATIVE_ADDRESS,
} from './NativeCurrency'
import { Token } from './Token'
import { WrappedNative, wrappedTokens } from './WrappedNative'

type TokenCacheKey = `${number}:${Address}`

const TOKEN_METADATA_OVERRIDES: Record<Address, Partial<TokenMetadata>> = {
	'0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2': { name: 'Maker', symbol: 'MKR' },
}

@Injectable()
export class TokenUtils {
	constructor(
		private readonly chainClientService: ChainClientService,
		private readonly tokenApiService: TokenApiService,
	) {}
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

		if (this.isNative(checksumAddress)) {
			const token = this._createNative(chainId)

			this.tokenCache.set(
				this.getCacheKey(NATIVE_ADDRESS, chainId),
				token,
			)

			return token as T
		}

		const metadata = await this.getTokenMetadata(checksumAddress, chainId)

		let token: T

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

	private async getTokenMetadata(
		address: Address,
		chainId: number,
	): Promise<TokenMetadata> {
		try {
			const metadata = await this.getMetadataFromApi(address, chainId)

			return metadata
		} catch {
			const metadata = await this.getMetadataFromBlockchain(
				address,
				chainId,
			)

			return metadata
		}
	}

	private async getMetadataFromApi(
		address: Address,
		chainId: number,
	): Promise<TokenMetadata> {
		const client = this.chainClientService.getClient(chainId)

		const rpcUrl = client.chain.rpcUrls.default.http[0]

		const metadata = await this.tokenApiService.getTokenMetadata(
			address,
			chainId,
			rpcUrl,
		)

		return metadata
	}

	private async getMetadataFromBlockchain(
		address: Address,
		chainId: number,
	): Promise<TokenMetadata> {
		const client = this.chainClientService.getClient(chainId)
		const overrides = TOKEN_METADATA_OVERRIDES[address]

		const contract = getContract({ address, abi: ERC20_ABI, client })

		const [decimals, name, symbol] = await Promise.all([
			contract.read.decimals(),
			overrides?.name ?? this.readStringOrBytes32(address, 'name', chainId),
			overrides?.symbol ?? this.readStringOrBytes32(address, 'symbol', chainId),
		])

		return { symbol, name, decimals }
	}

	private async readStringOrBytes32(
		address: Address,
		fn: 'name' | 'symbol',
		chainId: number,
	): Promise<string> {
		const client = this.chainClientService.getClient(chainId)

		try {
			const contract = getContract({ address, abi: ERC20_ABI, client })

			return await contract.read[fn]()
		} catch {
			const bytes32Abi = [
				{
					inputs: [],
					name: fn,
					outputs: [{ type: 'bytes32' }],
					stateMutability: 'view',
					type: 'function',
				},
			] as const

			const data = encodeFunctionData({ abi: bytes32Abi, functionName: fn })
			const raw = await client.call({ to: address, data })

			const decoded = decodeFunctionResult({
				abi: bytes32Abi,
				functionName: fn,
				data: raw.data!,
			})

			return trim(decoded as `0x${string}`, { dir: 'right' })
		}
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
		} catch {
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
