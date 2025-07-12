import { Address, getAddress, isAddress } from 'viem'
import { ClientManager } from '../../utils/ClientManager'

export class BaseContractError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, BaseContractError.prototype)
		this.name = 'BaseContractError'
	}
}

export abstract class BaseContract {
	public readonly address: Address
	constructor(
		address: Address,
		public readonly chainId: number,
	) {
		this.validateAddress(address)
		this.address = getAddress(address)
	}

	private validateAddress(address: Address) {
		if (!isAddress(address)) {
			throw new BaseContractError(`Contract address is invalid `)
		}
	}

	get client() {
		return ClientManager.getClient(this.chainId)
	}

	get wallet() {
		return ClientManager.getWalletClient(this.chainId)
	}

	get account() {
		return this.wallet.account
	}
}
