import { Injectable } from '@nestjs/common'
import {
	Chain,
	createPublicClient,
	createWalletClient,
	fallback,
	FallbackTransport,
	http,
	HttpTransportConfig,
	LocalAccount,
	PublicClient,
	Transport,
	WalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import * as chains from 'viem/chains'
import {
	arbitrum,
	base,
	bsc,
	fuse,
	lightlinkPhoenix,
	mainnet,
	story,
} from 'viem/chains'
import { getAlchemyRpcUrl } from './alchemy'
import { createCustomError, getPrivateKey } from './common'

const CUSTOM_RPC_URLS: Record<number, string> = {
	[mainnet.id]: getAlchemyRpcUrl(mainnet.id),
	[arbitrum.id]: getAlchemyRpcUrl(arbitrum.id),
	[bsc.id]: getAlchemyRpcUrl(bsc.id),
	[story.id]: getAlchemyRpcUrl(story.id),
	[lightlinkPhoenix.id]: `https://endpoints.omniatech.io/v1/lightlink/phoenix/bcd6910e361449d088886a7bfe37586c`,
	[fuse.id]: `https://lb.drpc.org/ogrpc?network=fuse&dkey=REDACTED_API_KEY`,
	// [hemi.id]: `https://endpoints.omniatech.io/v1/hemi/mainnet/0292053309264c18932589701ab5020a`,
	[base.id]: getAlchemyRpcUrl(base.id),
} as const

@Injectable()
export class ChainClientService {
	public customError = createCustomError('ChainClientService')

	private clients: Map<
		number,
		PublicClient<FallbackTransport, Chain, undefined, undefined>
	> = new Map()
	private customRpcUrls: Map<number, URL> = new Map()

	private walletClients: Map<
		number,
		WalletClient<FallbackTransport, Chain, LocalAccount, undefined>
	> = new Map()

	getWalletClient(
		chainId: number,
	): WalletClient<FallbackTransport, Chain, LocalAccount, undefined> {
		const existingClient = this.walletClients.get(chainId)

		if (existingClient) return existingClient

		const chain = this.getChain(chainId)

		const transport = this.getTransport(chainId)

		const client = createWalletClient({
			account: privateKeyToAccount(getPrivateKey()),
			chain,
			transport,
		})

		this.walletClients.set(chainId, client)

		return client
	}

	/**
	 * Creates new client for passed chainId, or retrieves instance if it already exists
	 * @param chainId
	 * @returns PublicClient
	 * @dev If custom rpc url is set, it will be used ONCE the client is created
	 */
	getClient(
		chainId: number,
	): PublicClient<FallbackTransport, Chain, undefined, undefined> {
		const existingClient = this.clients.get(chainId)

		if (existingClient) return existingClient

		const chain = this.getChain(chainId)
		const transport = this.getTransport(chainId)

		const client = createPublicClient<
			FallbackTransport,
			Chain,
			undefined,
			undefined
		>({
			chain,
			transport,
		})

		this.clients.set(chainId, client)

		return client
	}

	getTransport(chainId: number): FallbackTransport {
		const chain = this.findChainById(chainId)

		const transports: Transport[] = []

		const defaultTransportConfig: HttpTransportConfig = {
			timeout: 6_000,
			batch: false,
			// onFetchRequest(request, init) {
			// },
		}

		/* ======== Insert Default Transport ======== */

		const defaultRpcUrl = chain.rpcUrls.default.http[0]

		if (defaultRpcUrl) {
			transports.push(http(defaultRpcUrl, defaultTransportConfig))
		}

		/* ======== Insert Custom Transports ======== */

		const customRpcUrl = this.customRpcUrls.get(chainId)?.toString()

		if (customRpcUrl) {
			transports.push(http(customRpcUrl, defaultTransportConfig))
		}

		const customTransportFromCollection = CUSTOM_RPC_URLS[chainId]

		if (
			customTransportFromCollection &&
			customTransportFromCollection !== customRpcUrl
		) {
			transports.push(
				http(customTransportFromCollection, defaultTransportConfig),
			)
		}

		/* ======== Build Fallback Transport ======== */

		return fallback(transports, {
			retryCount: 3,
			retryDelay: 500,
			// rank: true results in strange behavior
			// significantly slows down process while doing many requests
			rank: false,
		})
	}

	getChain(chainId: number): Chain {
		const chain = this.findChainById(chainId)
		return {
			...chain,
			fees: {
				baseFeeMultiplier: () => 1.5,
			},
		}
	}

	//TODO: update this method with nestjs behavior
	/**
	 * MUST be called before client creation in `getClient()` call
	 * Otherwise, the client will not use the custom rpc url
	 * @param chainId
	 * @param rpcUrl - optional, if not provided, the custom rpc url will be fetched from the `CUSTOM_RPC_URLS` map
	 */
	useCustomRpcUrl(chainId: number, rpcUrl?: string): void {
		if (rpcUrl) {
			const url = new URL(rpcUrl)
			this.customRpcUrls.set(chainId, url)
			return
		}

		const customRpcUrl = this.getCustomRpcUrl(chainId) as string

		if (!customRpcUrl) {
			throw new this.customError(
				`Custom rpc url not found for chain ${chainId}`,
			)
		}

		const url = new URL(customRpcUrl)
		this.customRpcUrls.set(chainId, url)
	}

	getCustomRpcUrl(chainId: number): string | undefined {
		return CUSTOM_RPC_URLS[chainId]
	}

	findChainById(chainId: number): Chain {
		const chain = Object.values(chains).find(
			(chain) => chain.id === chainId,
		)

		if (!chain) {
			throw new this.customError(
				`Chain with id ${chainId} not found in viem chains`,
			)
		}

		return chain
	}

	findChainByName(chainName: string): Chain {
		chainName = chainName.toLowerCase()

		if (chainName === 'bsc' || chainName === 'bnb') return chains.bsc

		if (chainName === 'ethereum' || chainName === 'mainnet')
			return chains.mainnet

		const chain = Object.values(chains).find((chain) => {
			if (chain.name.toLowerCase().includes('testnet')) return false
			if (chain.name.toLowerCase().includes('goerli')) return false
			if (chain.name.toLowerCase().includes('sepolia')) return false
			return chain.name.toLowerCase().includes(chainName.toLowerCase())
		})
		return chain as Chain
	}

	clearClients(): void {
		this.clients.clear()
	}

	getChainNameById(id: number): string {
		const fullName = this.findChainById(id).name
		const keywords = ['Mainnet']

		const nameWithoutKeywords = keywords
			.reduce((acc, keyword) => {
				return acc.replace(keyword, '')
			}, fullName)
			.trim()
		return nameWithoutKeywords
	}
}
