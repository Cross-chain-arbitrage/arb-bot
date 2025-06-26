import { getAddress, TransactionReceipt } from 'viem'
import { BaseContract } from '../../primitives/contracts/BaseContract'
import { Token } from '../../primitives/tokens/Token'
import { createCustomError } from '../../utils/common'
import { CHAIN_PERIPHERY_CONFIG } from '../periphery'
import { POOL_ERRORS, PoolType } from '../poolVariety'

export abstract class Pool extends BaseContract {
	public readonly customError: ReturnType<typeof createCustomError>

	constructor(
		public readonly token0: Token,
		public readonly token1: Token,
		poolAddress: Address,
		public readonly routerAddress: Address,
		public readonly chainId: number,
		public readonly poolType: PoolType,
		public readonly factory: Address,
	) {
		super(poolAddress, chainId)
		this.customError = POOL_ERRORS[poolType]
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
			throw new this.customError(`Swap failed, tx: ${hash}`)

		const amountOut = this.parseAmountOut(receipt)

		return { receipt, amountOut }
	}

	static getPeripherySafe(
		chainId: number,
		poolType: PoolType,
		factory: Address,
	): UniV3PoolPeriphery | UniV2PoolPeriphery {
		const periphery =
			CHAIN_PERIPHERY_CONFIG[chainId]?.[poolType]?.[getAddress(factory)]

		if (!periphery) {
			throw new POOL_ERRORS[poolType](
				`No periphery configuration found for ${poolType} on chain ${chainId} with factory ${factory}`,
			)
		}

		return periphery
	}

	multiplyGas(gas: bigint) {
		//TODO: remove magic number
		return (gas * 15n) / 10n
	}

	calcDeadline(secondsToAdd: number): bigint {
		return BigInt(Math.floor(Date.now() / 1000) + secondsToAdd)
	}
}
