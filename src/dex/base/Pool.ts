import { TransactionReceipt } from 'viem'
import { BaseContract } from '../../primitives/contracts/BaseContract'
import { Token } from '../../primitives/tokens/Token'
import { PoolType } from '../poolVariety'

export abstract class Pool extends BaseContract {
	constructor(
		public readonly token0: Token,
		public readonly token1: Token,
		poolAddress: Address,
		public readonly routerAddress: Address,
		public readonly chainId: number,
		public readonly poolType: PoolType,
	) {
		super(poolAddress, chainId)
	}

	abstract getPrices(): Promise<{ price: number; sqrtPriceX96: bigint }>

	abstract quoteSwap(params: SwapParams): Promise<{
		amountOut: bigint
		fee: number
	}>

	abstract simulateSwap(params: SwapParams): Promise<{
		amountOut: bigint
		request: SimulateRequestWithAccount
	}>

	abstract parseAmountOut(swapReceipt: TransactionReceipt): bigint

	async swap(params: SwapParams) {
		const { request } = await this.simulateSwap(params)

		const gas = await this.client.estimateContractGas({
			...request,
		})

		const hash = await this.wallet.writeContract({
			...request,
			gas: this.multiplyGas(gas),
		})

		const receipt = await this.client.waitForTransactionReceipt({ hash })

		if (receipt.status !== 'success')
			throw new Error(`Swap failed, tx: ${hash}`)

		const amountOut = this.parseAmountOut(receipt)

		return { receipt, amountOut }
	}

	multiplyGas(gas: bigint) {
		//TODO: remove magic number
		return (gas * 15n) / 10n
	}
}
