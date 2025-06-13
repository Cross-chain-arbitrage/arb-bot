import { WETH_ABI } from '../../abi/weth'
import { getAccountAddress } from '../../utils/getAccount'
import { NativeCurrency } from './NativeCurrency'
import { Token } from './Token'
import { TokenUtils } from './TokenUtils'

export class WethError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, WethError.prototype)
		this.name = 'WethError'
	}
}

export class WETH extends Token {
	private readonly native: NativeCurrency

	constructor(address: Address, chainId: number) {
		super(address, chainId, 'WETH', 18, 'Wrapped Ether')
		this.native = TokenUtils.getNative(chainId)
	}

	async deposit(amount: bigint) {
		const balance = await this.native.balanceOf(getAccountAddress())

		if (balance < amount) {
			throw new WethError('Insufficient balance')
		}

		const hash = await this.wallet.writeContract({
			address: this.address,
			abi: WETH_ABI,
			functionName: 'deposit',
			account: this.wallet.account!,
			chain: this.wallet.chain,
		})

		const receipt = await this.client.waitForTransactionReceipt({ hash })

		if (receipt.status !== 'success')
			throw new WethError(`Deposit failed, tx: ${hash}`)

		return receipt
	}

	async withdraw(amount: bigint) {
		const balance = await this.balanceOf(getAccountAddress())

		if (balance < amount) {
			throw new WethError('Insufficient balance')
		}

		const hash = await this.wallet.writeContract({
			address: this.address,
			abi: WETH_ABI,
			functionName: 'withdraw',
			account: this.wallet.account!,
			chain: this.wallet.chain,
			args: [amount],
		})

		const receipt = await this.client.waitForTransactionReceipt({ hash })

		if (receipt.status !== 'success')
			throw new WethError(`Withdraw failed, tx: ${hash}`)

		return receipt
	}
}
