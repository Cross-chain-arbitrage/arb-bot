import {
	createPublicClient,
	http,
	PublicClient,
	WalletClient,
	createWalletClient,
} from "viem"
import * as chains from "viem/chains"
import { getPrivateKey } from "./getAccount"
import { privateKeyToAccount } from "viem/accounts"

export class ClientManager {
	private static clients: Map<number, PublicClient> = new Map()

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

		return client
	}

	static getClient(chainId: number): PublicClient {
		const batch = {
			multicall: true,
		}

		const cacheTime = 4000

		// Check if client already exists
		const existingClient = this.clients.get(chainId)

		if (existingClient) {
			return existingClient
		}

		// Find chain config
		const chain = this.findChainById(chainId)

		// Create new client
		const client = createPublicClient({
			chain,
			batch,
			cacheTime,
			transport: http(),
		})

		//TODO: check why use type assertion
		// Store client
		this.clients.set(chainId, client as PublicClient)

		return client as PublicClient
	}

	static findChainById(chainId: number) {
		const chain = Object.values(chains).find(
			(chain) => chain.id === chainId,
		)

		if (!chain) {
			throw new Error(`Chain with id ${chainId} not found in viem chains`)
		}

		return chain
	}

	static clearClients(): void {
		this.clients.clear()
	}
}
