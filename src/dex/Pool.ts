import { BaseContract } from '../utils/contracts/BaseContract'
import { Token } from '../utils/tokens/Token'

export abstract class Pool extends BaseContract {
	constructor(
		public readonly token0: Token,
		public readonly token1: Token,
		poolAddress: Address,
		chainId: number,
	) {
		super(poolAddress, chainId)
	}

	abstract getPrices(): Promise<{ price: number; sqrtPriceX96: bigint }>

	abstract quoteSwap(params: SwapParams): Promise<{
		amountOut: bigint
		fee: number
	}>

	abstract swap(params: SwapParams): Promise<string>
}
