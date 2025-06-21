import {
	Chain,
	createPublicClient,
	createWalletClient,
	fallback,
	http,
	PublicClient,
	Transport,
	WalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import * as chains from 'viem/chains'

import { arbitrum, bsc, lightlinkPhoenix, mainnet, story } from 'viem/chains'
import { getAlchemyRpcUrl } from './alchemy'
import { getPrivateKey } from './common'

const CUSTOM_RPC_URLS: Record<number, string> = {
	[mainnet.id]: getAlchemyRpcUrl(mainnet.id),
	[arbitrum.id]: getAlchemyRpcUrl(arbitrum.id),
	[bsc.id]: getAlchemyRpcUrl(bsc.id),
	[story.id]: getAlchemyRpcUrl(story.id),
	[lightlinkPhoenix.id]: `https://endpoints.omniatech.io/v1/lightlink/phoenix/bcd6910e361449d088886a7bfe37586c`,
	// [hemi.id]: `https://endpoints.omniatech.io/v1/hemi/mainnet/0292053309264c18932589701ab5020a`,
} as const

export class ClientManagerError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, ClientManagerError.prototype)
		this.name = 'ClientManagerError'
	}
}

export class ClientManager {
	static requestCounter = 0
	private static clients: Map<number, PublicClient> = new Map()
	private static _customRpcUrls: Map<number, URL> = new Map()

	private static _walletClients: Map<number, WalletClient> = new Map()

	static getWalletClient(chainId: number): WalletClient {
		if (this._walletClients.has(chainId)) {
			return this._walletClients.get(chainId) as WalletClient
		}

		const chain = this.findChainById(chainId)

		const client = createWalletClient({
			account: privateKeyToAccount(getPrivateKey()),
			chain,
			transport: http(),
		})

		this._walletClients.set(chainId, client)

		return client as WalletClient
	}

	/**
	 * Creates new client for passed chainId, or retrieves instance if it already exists
	 * @param chainId
	 * @returns PublicClient
	 * @dev If custom rpc url is set, it will be used ONCE the client is created
	 */
	static getClient(chainId: number): PublicClient {
		const batch = {
			multicall: true,
		}

		// Check if client already exists
		const existingClient = this.clients.get(chainId)

		if (existingClient) {
			return existingClient
		}

		// Find chain config
		const chain = this.findChainById(chainId)

		// Use custom rpc url if set
		// const setRpcUrl = this._customRpcUrls.get(chainId)?.toString()

		// const customRpcUrlFromCollection = this.getCustomRpcUrl(chainId)

		const defaultRpcUrl =
			chainId === arbitrum.id
				? getAlchemyRpcUrl(arbitrum.id)
				: chain.rpcUrls.default.http[0]

		const transports: Transport[] = [
			http(defaultRpcUrl, {
				retryCount: 3,
				retryDelay: 500,
				timeout: 8_000,
				batch: {
					batchSize: 1024,
					wait: 50,
				},
				// onFetchRequest: (request) => {
				// 	console.log('request', request.url)
				// },
				// onFetchResponse: (response) => {
				// 	console.log('response', response.status)
				// },
			}),
		]

		// if (setRpcUrl) transports.push(http(setRpcUrl, { retryCount: 3 }))
		// if (customRpcUrlFromCollection)
		// transports.push(http(customRpcUrlFromCollection, { retryCount: 3 }))

		// Create new client
		const client = createPublicClient({
			chain,
			batch,
			transport: fallback(transports),
		})

		//TODO: check why use type assertion
		// Store client
		this.clients.set(chainId, client as PublicClient)

		return client as PublicClient
	}

	/**
	 * MUST be called before client creation in `getClient()` call
	 * Otherwise, the client will not use the custom rpc url
	 * @param chainId
	 * @param rpcUrl - optional, if not provided, the custom rpc url will be fetched from the `CUSTOM_RPC_URLS` map
	 */
	static useCustomRpcUrl(chainId: number, rpcUrl?: string): void {
		if (rpcUrl) {
			const url = new URL(rpcUrl)
			this._customRpcUrls.set(chainId, url)
			return
		}

		const customRpcUrl = this.getCustomRpcUrl(chainId) as string

		if (!customRpcUrl) {
			throw new ClientManagerError(
				`Custom rpc url not found for chain ${chainId}`,
			)
		}

		const url = new URL(customRpcUrl)
		this._customRpcUrls.set(chainId, url)
	}

	static getCustomRpcUrl(chainId: number): string | undefined {
		return CUSTOM_RPC_URLS[chainId]
	}

	static findChainById(chainId: number): Chain {
		const chain = Object.values(chains).find(
			(chain) => chain.id === chainId,
		)

		if (!chain) {
			throw new ClientManagerError(
				`Chain with id ${chainId} not found in viem chains`,
			)
		}

		return chain
	}

	static findChainByName(chainName: string): Chain {
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

	static clearClients(): void {
		this.clients.clear()
	}
}
