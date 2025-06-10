import { Account, Address, isAddress, PublicClient, WalletClient } from 'viem'
import { ClientManager } from '../ClientManager'

export class BaseContractError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, BaseContractError.prototype)
		this.name = 'BaseContractError'
	}
}

export abstract class BaseContract {
	constructor(
		public readonly address: Address,
		public readonly chainId: number,
	) {
		this.validateAddress(address)
	}

	private validateAddress(address: Address) {
		if (!isAddress(address)) {
			throw new BaseContractError(`Contract address is invalid `)
		}
	}

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
