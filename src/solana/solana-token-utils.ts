import {
	fetchMetadata,
	findMetadataPda,
	mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata'
import { publicKey } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { Injectable } from '@nestjs/common'
import { getMint } from '@solana/spl-token'
import { Connection, PublicKey } from '@solana/web3.js'
import { SolanaNative, solanaNativeAddress } from './solana-native'
import { SolanaToken } from './solana-token'
import {
	WrappedSolanaNative,
	wrappedSolanaNativeAddress,
} from './wrapped-native'

type TokenCacheKey = string

@Injectable()
export class TokenUtils {
	constructor() {}
	/* ======== STATE ======== */

	private tokenCache: Map<
		TokenCacheKey,
		SolanaToken | WrappedSolanaNative | SolanaNative
	> = new Map()

	/* ======== PUBLIC ======== */

	async getWrappedNative(): Promise<WrappedSolanaNative> {
		return this.fromAddress<WrappedSolanaNative>(wrappedSolanaNativeAddress)
	}

	async fromAddress<
		T extends SolanaToken | WrappedSolanaNative | SolanaNative,
	>(address: string): Promise<T> {
		const cacheKey = this.getCacheKey(address.toLowerCase())
		const cachedToken = this.tokenCache.get(cacheKey)

		if (cachedToken) {
			return cachedToken as T
		}

		if (address === solanaNativeAddress) {
			const token = new SolanaNative()

			this.tokenCache.set(cacheKey, token)

			return token as T
		}

		if (address === wrappedSolanaNativeAddress) {
			const token = new WrappedSolanaNative()

			this.tokenCache.set(cacheKey, token)

			return token as T
		}

		const metadata = await this.getTokenMetadata(address)

		const token = new SolanaToken(address, metadata)

		this.tokenCache.set(cacheKey, token)

		return token as T
	}

	getNative(): SolanaNative {
		const cacheKey = this.getCacheKey(solanaNativeAddress)
		const cachedToken = this.tokenCache.get(cacheKey)

		if (cachedToken) {
			return cachedToken as SolanaNative
		}

		const token = new SolanaNative()

		this.tokenCache.set(cacheKey, token)

		return token
	}

	/* ======== INTERNAL ======== */

	private getCacheKey(address: string): TokenCacheKey {
		return address.toLowerCase()
	}

	async getTokenMetadata(mintAddress: string) {
		const [nameAndSymbol, decimals] = await Promise.all([
			this.getNameAndSymbol(mintAddress),
			this.getDecimals(mintAddress),
		])

		return {
			name: nameAndSymbol.name,
			symbol: nameAndSymbol.symbol,
			decimals,
		}
	}

	async getNameAndSymbol(mintAddress: string) {
		// Create Umi instance
		const umi = createUmi('https://api.mainnet-beta.solana.com')

		umi.use(mplTokenMetadata())

		// Find metadata PDA
		const mint = publicKey(mintAddress)
		const metadataPda = findMetadataPda(umi, { mint })

		// Fetch metadata account
		const metadata = await fetchMetadata(umi, metadataPda)

		return {
			name: metadata.name.replace(/\0/g, ''),
			symbol: metadata.symbol.replace(/\0/g, ''),
		}
	}

	async getDecimals(mintAddress: string) {
		const connection = new Connection('https://api.mainnet-beta.solana.com')
		const mintPublicKey = new PublicKey(mintAddress)
		const mintInfo = await getMint(connection, mintPublicKey)

		return mintInfo.decimals
	}
}
