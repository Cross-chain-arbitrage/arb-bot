import { Injectable } from '@nestjs/common'
import {
	decodeEventLog,
	erc20Abi,
	isAddressEqual,
	TransactionReceipt,
} from 'viem'
import { ChainClientService } from './chain-client/chain-client.service'
import { NativeCurrency } from './primitives/tokens/NativeCurrency'
import { Token } from './primitives/tokens/Token'

@Injectable()
export class EvmHelper {
	constructor(private readonly chainClientService: ChainClientService) {}

	async waitForTransactionReceipt(chainId: number, hash: Hex) {
		return this.chainClientService
			.getClient(chainId)
			.waitForTransactionReceipt({
				hash,
			})
	}

	/**
	 * @param address default: user address from ChainClientService
	 * @dev The native currency change may be inaccurate.
	 * It is calculated as: balance in the block with the transaction
	 * minus the balance in the block before it.
	 */
	async parseBalanceChange(
		token: Token | NativeCurrency,
		txReceipt: TransactionReceipt,
		addressToCheckDiff?: Address,
	) {
		if (addressToCheckDiff === undefined) {
			addressToCheckDiff = this.chainClientService.getWalletClient(
				token.chainId,
			).account.address
		}

		if (token instanceof Token)
			return this.parseTokenBalanceChange(
				token,
				txReceipt,
				addressToCheckDiff,
			)

		return this.parseNativeBalanceChange(
			token,
			txReceipt,
			addressToCheckDiff,
		)
	}

	private parseTokenBalanceChange(
		token: Token,
		txReceipt: TransactionReceipt,
		addressToCheckDiff: Address,
	) {
		let balanceChange = 0n

		for (const log of txReceipt.logs) {
			if (!isAddressEqual(log.address, token.address)) continue

			const event = decodeEventLog({
				abi: erc20Abi,
				data: log.data,
				topics: log.topics,
			})

			if (event.eventName !== 'Transfer') continue

			const { from, to, value } = event.args

			switch (true) {
				case isAddressEqual(from, addressToCheckDiff):
					balanceChange -= value
					break

				case isAddressEqual(to, addressToCheckDiff):
					balanceChange += value
					break

				default:
					continue
			}
		}

		return balanceChange
	}

	private async parseNativeBalanceChange(
		nativeCurrency: NativeCurrency,
		txReceipt: TransactionReceipt,
		addressToCheckDiff: Address,
	) {
		const balanceBlockBefore = await nativeCurrency.balanceOf(
			addressToCheckDiff,
			txReceipt.blockNumber - 1n,
		)

		const balanceBlockWithTx = await nativeCurrency.balanceOf(
			addressToCheckDiff,
			txReceipt.blockNumber,
		)

		return balanceBlockWithTx - balanceBlockBefore
	}
}
