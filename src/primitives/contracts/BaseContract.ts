import { Address, isAddress } from 'viem'
import { ClientManager } from '../../utils/ClientManager'

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

	protected get client() {
		return ClientManager.getClient(this.chainId)
	}

	protected get wallet() {
		return ClientManager.getWalletClient(this.chainId)
	}

	protected get account() {
		return this.wallet.account
	}
}
