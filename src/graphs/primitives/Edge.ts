import { Stargate } from '../../bridges/stargate/Stargate'
import { Pool } from '../../dex/Pool'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { Graph } from './Graph'

export enum ActionType {
	SWAP = 'SWAP',
	STARGATE_BRIDGE = 'STARGATE_BRIDGE',
	FUSE_BRIDGE = 'FUSE_BRIDGE',
	WRAP = 'WRAP',
	UNWRAP = 'UNWRAP',
}

export abstract class Edge {
	abstract id: EdgeId

	lastRate: number | undefined

	constructor(
		readonly from: GraphNode,
		readonly to: GraphNode,
		readonly actionType: ActionType,
		readonly graph: Graph,
	) {}

	async getRate(amountIn: bigint): Promise<GetRateResult> {
		const cachedRate = this.graph.getCachedEdgeRate(this.id)
		if (cachedRate) return cachedRate

		const rateResult = await this.getRateWithoutCache(amountIn)
		this.lastRate = rateResult.rate

		this.graph.cacheEdgeRate(this.id, rateResult)

		return rateResult
	}

	protected calcRate(amountIn: bigint, amountOut: bigint) {
		return -Math.log(Number(amountOut) / Number(amountIn))
	}

	abstract getRateWithoutCache(amountIn: bigint): Promise<GetRateResult>
}

export class SwapEdge extends Edge {
	readonly id: EdgeId

	constructor(
		readonly from: Token,
		readonly to: Token,
		readonly pool: Pool,
		graph: Graph,
	) {
		super(from, to, ActionType.SWAP, graph)
		this.id = `${this.from.id}-${this.to.id}-${this.actionType}-${this.pool.address}`
	}

	async getRateWithoutCache(amountIn: bigint): Promise<GetRateResult> {
		const { amountOut } = await this.pool.quoteSwap({
			tokenIn: this.from,
			tokenOut: this.to,
			amountIn,
			slippage: 0.01,
		})

		const rate = this.calcRate(amountIn, amountOut)

		return {
			rate,
			amountOut,
		}
	}
}

export class StargateBridgeEdge extends Edge {
	readonly id: EdgeId

	constructor(
		readonly from: GraphNode,
		readonly to: GraphNode,
		graph: Graph,
	) {
		super(from, to, ActionType.STARGATE_BRIDGE, graph)
		this.id = `${this.from.id}-${this.to.id}-${this.actionType}`
	}

	getRateWithoutCache = async (amountIn: bigint) => {
		const { expectedAmountOut: amountOut } =
			await Stargate.getExpectedAmountOut(
				this.from,
				amountIn,
				this.to.chainId,
			)

		const rate = this.calcRate(amountIn, amountOut)

		return {
			rate,
			amountOut,
		}
	}
}

class CommonEdge extends Edge {
	readonly id: EdgeId

	constructor(
		readonly from: GraphNode,
		readonly to: GraphNode,
		readonly actionType: ActionType,
		graph: Graph,
	) {
		super(from, to, actionType, graph)
		this.id = `${this.from.id}-${this.to.id}-${this.actionType}`
	}

	getRateWithoutCache(amountIn: bigint) {
		return Promise.resolve({
			rate: 0,
			amountOut: amountIn,
		})
	}
}

export class FuseBridgeEdge extends CommonEdge {
	constructor(
		readonly from: GraphNode,
		readonly to: GraphNode,
		graph: Graph,
	) {
		super(from, to, ActionType.FUSE_BRIDGE, graph)
	}
}

export class WrapEdge extends CommonEdge {
	constructor(
		readonly from: NativeCurrency,
		readonly to: Token,
		graph: Graph,
	) {
		super(from, to, ActionType.WRAP, graph)
	}
}

export class UnwrapEdge extends CommonEdge {
	constructor(
		readonly from: Token,
		readonly to: NativeCurrency,
		graph: Graph,
	) {
		super(from, to, ActionType.UNWRAP, graph)
	}
}
