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
import { createCustomError } from '../../../../utils/common'
import { ChainClientConfigService } from './chain-client-config.service'

@Injectable()
export class ChainClientService {
	constructor(private readonly config: ChainClientConfigService) {}

	public customError = createCustomError('ChainClientService')

	private clients: Map<
		number,
		PublicClient<FallbackTransport, Chain, undefined, undefined>
	> = new Map()

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
			account: privateKeyToAccount(this.config.privateKey),
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

		if (existingClient) {
			return existingClient
		}

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

		/* ======== Insert Additional Transports ======== */

		const additionalRpcUrls = this.config.rpcUrls?.[chainId]

		if (additionalRpcUrls) {
			additionalRpcUrls.forEach((rpcUrl) => {
				transports.push(http(rpcUrl, defaultTransportConfig))
			})
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

	findChainById(chainId: number): Chain {
		let chain: Chain | undefined = Object.values(chains).find(
			(chain) => chain.id === chainId,
		)

		if (!chain) {
			chain = this.config.customChains?.find(
				(chain) => chain.id === chainId,
			)
		}

		if (!chain) {
			throw new this.customError(
				`Chain with id ${chainId} not found in viem chains and custom chains`,
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
		this.walletClients.clear()
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
