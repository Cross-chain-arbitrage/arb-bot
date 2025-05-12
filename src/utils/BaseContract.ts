import { Account, Address, PublicClient, WalletClient } from "viem"
import { ClientManager } from "./ClientManager"

export abstract class BaseContract {
	constructor(
		public readonly chainId: number,
		public readonly address: Address,
	) {}

	protected get client(): PublicClient {
		return ClientManager.getClient(this.chainId)
	}

	protected get wallet(): WalletClient {
		return ClientManager.getWalletClient(this.chainId)
	}

	protected get account(): Account {
		return this.wallet.account as Account
	}
}
