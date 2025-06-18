import {
	Chain,
	createPublicClient,
	createWalletClient,
	http,
	PublicClient,
	WalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import * as chains from 'viem/chains'

import { arbitrum, bsc, mainnet } from 'viem/chains'
import { getAlchemyRpcUrl } from './alchemy'
import { getPrivateKey } from './getAccount'

const CUSTOM_RPC_URLS = {
	[mainnet.id]: getAlchemyRpcUrl(mainnet.id),
	[arbitrum.id]: getAlchemyRpcUrl(arbitrum.id),
	[bsc.id]: getAlchemyRpcUrl(bsc.id),
} as const

export class ClientManagerError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, ClientManagerError.prototype)
		this.name = 'ClientManagerError'
	}
}

export class ClientManager {
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
		const rpcUrl = this._customRpcUrls.get(chainId)?.toString()

		// Create new client
		const client = createPublicClient({
			chain,
			batch,
			transport: http(rpcUrl),
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
	 * @param rpcUrl
	 */
	static useCustomRpcUrl(chainId: number): void {
		const rpcUrl = this.getCustomRpcUrl(chainId) as string

		if (!rpcUrl) {
			throw new ClientManagerError(
				`Custom rpc url not found for chain ${chainId}`,
			)
		}

		const url = new URL(rpcUrl)
		this._customRpcUrls.set(chainId, url)
	}

	static getCustomRpcUrl(chainId: number): string | undefined {
		return CUSTOM_RPC_URLS[chainId as keyof typeof CUSTOM_RPC_URLS]
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
