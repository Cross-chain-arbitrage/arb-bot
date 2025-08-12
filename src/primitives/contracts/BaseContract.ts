import { Address, getAddress, isAddress } from 'viem'
import { ChainClientService } from '../../chain-client/chain-client.service'

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
		public readonly chainClientService: ChainClientService,
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
		return this.chainClientService.getClient(this.chainId)
	}

	get wallet() {
		return this.chainClientService.getWalletClient(this.chainId)
	}

	get account() {
		return this.wallet.account
	}
}
