import { UNIV3_POOL_ABI } from '../../../../evm/abi/uniV3/uniV3Pool'
import { isEventNameEqualSwap } from '../../../base/bricks/common-bricks'
import {
	defineAmountsFromEventUniV3,
	getPriceFromSlot,
	quoteSwapUniV3,
	RouterType,
	simulateSwapUniV3,
} from '../../../base/bricks/uni-v3-bricks'
import { Pool, PoolConstructorParams } from '../../../base/pool'

export class UniV3Pool extends Pool {
	public readonly fee: number
	public readonly quoterAddress: Address
	public readonly routerType: RouterType
	public readonly permit2Address: Address | undefined

	constructor(
		params: Omit<PoolConstructorParams, 'poolAbi'>,
		fee: number,
		quoterAddress: Address,
		routerType: RouterType,
		permit2Address?: Address,
	) {
		super({
			...params,
			poolAbi: UNIV3_POOL_ABI,
		})

		this.fee = fee
		this.quoterAddress = quoterAddress
		this.routerType = routerType
		this.permit2Address = permit2Address
	}

	override async getPrice(): Promise<{
		price: number
		sqrtPriceX96: bigint
	}> {
		return getPriceFromSlot.bind(this)('slot0', 0)
	}

	override _quoteSwap = quoteSwapUniV3
	override _simulateSwap = simulateSwapUniV3
	override _isSwapEvent = isEventNameEqualSwap
	override _defineAmountsFromEvent = defineAmountsFromEventUniV3

	override async validateAllowance(swapParams: SwapParams) {
		switch (this.routerType) {
			case RouterType.V1:
			case RouterType.V2:
				return super.validateAllowance(swapParams)
			case RouterType.UNIVERSAL:
				return this.validateAllowanceForUniversalRouter(swapParams)
		}
	}

	private async validateAllowanceForUniversalRouter(swapParams: SwapParams) {
		const allowance = await swapParams.tokenIn.allowance(
			this.wallet.account.address,
			this.permit2Address!,
		)

		if (allowance < swapParams.amountIn) {
			throw new this.customError(
				`Insufficient allowance, needed ${swapParams.amountIn}, has ${allowance}`,
			)
		}
	}

	override async approveInfinite() {
		switch (this.routerType) {
			case RouterType.V1:
			case RouterType.V2:
				return super.approveInfinite()
			case RouterType.UNIVERSAL:
				return this.approveInfiniteForUniversalRouter()
		}
	}

	private async approveInfiniteForUniversalRouter() {
		const receipt0 = await this.token0.approveInfinite(this.permit2Address!)
		const receipt1 = await this.token1.approveInfinite(this.permit2Address!)

		return [receipt0, receipt1]
	}
}
