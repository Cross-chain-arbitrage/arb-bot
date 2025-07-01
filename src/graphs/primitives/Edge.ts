import { Hash } from 'viem'
import { FuseBridge } from '../../bridges/FuseBridge/FuseBridge'
import { Stargate } from '../../bridges/stargate/Stargate'
import { Pool } from '../../dex/base/Pool'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { WrappedNative } from '../../primitives/tokens/WrappedNative'
import { ClientManager } from '../../utils/ClientManager'
import { shortenAddress } from '../../utils/common'
import { Graph } from './Graph'

export enum ActionType {
	SWAP = 'SWAP',
	STARGATE_BRIDGE = 'STARGATE_BRIDGE',
	FUSE_BRIDGE = 'FUSE_BRIDGE',
	WRAP = 'WRAP',
	UNWRAP = 'UNWRAP',
}

export abstract class Edge<T extends ActionType = ActionType> {
	abstract id: EdgeId

	lastQuote: EdgeQuoteResult | undefined

	constructor(
		readonly from: GraphNode,
		readonly to: GraphNode,
		readonly actionType: T,
		readonly graph?: Graph,
	) {}

	async getRate(amountIn: bigint): Promise<GetRateResult> {
		const cachedRate = this.graph?.getCachedEdgeRate(
			`${this.id}-${amountIn.toString()}`,
		)
		if (cachedRate) return cachedRate

		const quoteResult = await this.quote(amountIn)
		this.lastQuote = quoteResult

		this.graph?.cacheEdgeRate(
			`${this.id}-${amountIn.toString()}`,
			quoteResult,
		)

		return quoteResult
	}

	protected calcRate(amountIn: bigint, amountOut: bigint) {
		return -Math.log(Number(amountOut) / Number(amountIn))
	}

	abstract quote(amountIn: bigint): Promise<EdgeQuoteResult>

	abstract execute(amountIn: bigint): Promise<EdgeExecutionResult<T>>
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

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const { amountOut, gas } = await this.pool.quoteSwap({
			tokenIn: this.from,
			tokenOut: this.to,
			amountIn,
			slippage: 0.01,
		})

		const rate = this.calcRate(amountIn, amountOut)

		return {
			rate,
			amountOut,
			cost: {
				gas,
			},
		}
	}

	async execute(
		amountIn: bigint,
	): Promise<EdgeExecutionResult<ActionType.SWAP>> {
		if (this.from.isNative()) {
			throw new Error(
				`Cannot swap from native currency: ${this.from.symbol} ${this.from.chainId} ${shortenAddress(this.from.address)}`,
			)
		}

		if (this.to.isNative()) {
			throw new Error(
				`Cannot swap to native currency: ${this.to.symbol} ${this.to.chainId} ${shortenAddress(this.to.address)}`,
			)
		}

		const { amountOut, receipt } = await this.pool.swap({
			amountIn,
			tokenIn: this.from,
			tokenOut: this.to,
		})

		return {
			amountOut,
			txReceipt: receipt,
		}
	}
}

export class StargateBridgeEdge extends Edge<ActionType.STARGATE_BRIDGE> {
	readonly id: EdgeId

	constructor(
		readonly from: GraphNode,
		readonly to: GraphNode,
		graph: Graph,
	) {
		super(from, to, ActionType.STARGATE_BRIDGE, graph)
		this.id = `${this.from.id}-${this.to.id}-${this.actionType}`
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const { amountOut, lzFee, gas } = await Stargate.quoteBridge(
			this.from,
			amountIn,
			this.to.chainId,
		)

		const rate = this.calcRate(amountIn, amountOut)

		return {
			rate,
			amountOut,
			cost: {
				gas,
				bridgeFee: lzFee,
			},
		}
	}

	async execute(
		amountIn: bigint,
	): Promise<EdgeExecutionResult<ActionType.STARGATE_BRIDGE>> {
		const fromToken = await TokenUtils.fromAddress(
			this.from.address,
			this.from.chainId,
		)

		const result = await Stargate.bridge(
			fromToken,
			this.to.chainId,
			ClientManager.getWalletClient(this.from.chainId).account.address,
			amountIn,
		)

		const srcTxReceipt = await ClientManager.getClient(
			this.from.chainId,
		).waitForTransactionReceipt({
			hash: result.bridgeTx.srcTxHash as Hash,
		})

		const message = await result.bridgeTx.waitForBridgeToFinish()

		return {
			amountOut: result.amountOut,
			srcTxReceipt,
			dstTxHash: message.dstTxHash as Hash,
			bridgeFee: result.lzFee,
		}
	}
}

export class FuseBridgeEdge extends Edge<ActionType.FUSE_BRIDGE> {
	readonly id: EdgeId

	constructor(
		readonly from: GraphNode,
		readonly to: GraphNode,
		graph: Graph,
	) {
		super(from, to, ActionType.FUSE_BRIDGE, graph)
		this.id = `${this.from.id}-${this.to.id}-${this.actionType}`
	}

	async execute(
		amountIn: bigint,
	): Promise<EdgeExecutionResult<ActionType.FUSE_BRIDGE>> {
		const { bridgeTx, lzFee } = await FuseBridge.bridge(
			this.from as Token,
			this.to.chainId,
			ClientManager.getWalletClient(this.to.chainId).account.address,
			amountIn,
		)

		const srcTxReceipt = await ClientManager.getClient(
			this.from.chainId,
		).waitForTransactionReceipt({ hash: bridgeTx.srcTxHash as Hash })

		const message = await bridgeTx.waitForBridgeToFinish()

		// output amount is the same as input amount
		// TODO: retrieve amount out from dst tx, because decimals could be different
		return {
			amountOut: amountIn,
			srcTxReceipt,
			dstTxHash: message.dstTxHash as Hash,
			bridgeFee: lzFee,
		}
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const { amountOut, lzFee, gas } = await FuseBridge.quoteBridge(
			this.from,
			this.to.chainId,
			amountIn,
		)

		const rate = this.calcRate(amountIn, amountOut)

		return {
			rate,
			amountOut,
			cost: {
				gas,
				bridgeFee: lzFee,
			},
		}
	}
}

abstract class CommonEdge<
	T extends ActionType.WRAP | ActionType.UNWRAP,
> extends Edge<T> {
	readonly id: EdgeId

	constructor(
		readonly from: GraphNode,
		readonly to: GraphNode,
		readonly actionType: T,
		graph: Graph,
	) {
		super(from, to, actionType, graph)
		this.id = `${this.from.id}-${this.to.id}-${this.actionType}`
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		return Promise.resolve({
			rate: 0,
			amountOut: amountIn,
			cost: {
				gas: 70000n,
				actionType: this.actionType as InchainActionType,
			},
		})
	}
}

export class WrapEdge extends CommonEdge<ActionType.WRAP> {
	constructor(
		readonly from: NativeCurrency,
		readonly to: Token,
		graph: Graph,
	) {
		super(from, to, ActionType.WRAP, graph)
	}

	async execute(
		amountIn: bigint,
	): Promise<EdgeExecutionResult<ActionType.WRAP>> {
		if (!(this.to instanceof WrappedNative)) {
			throw new Error(
				`Cannot wrap non-WETH token: ${this.to.symbol} ${this.to.chainId} ${shortenAddress(this.to.address)}`,
			)
		}

		const receipt = await this.to.deposit(amountIn)

		// output amount is the same as input amount
		return {
			amountOut: amountIn,
			txReceipt: receipt,
		}
	}
}

export class UnwrapEdge extends CommonEdge<ActionType.UNWRAP> {
	constructor(
		readonly from: Token,
		readonly to: NativeCurrency,
		graph: Graph,
	) {
		super(from, to, ActionType.UNWRAP, graph)
	}

	async execute(
		amountIn: bigint,
	): Promise<EdgeExecutionResult<ActionType.UNWRAP>> {
		if (!(this.from instanceof WrappedNative)) {
			throw new Error(
				`Cannot unwrap non-WETH token: ${this.from.symbol} ${this.from.chainId} ${shortenAddress(this.from.address)}`,
			)
		}

		const receipt = await this.from.withdraw(amountIn)

		// output amount is the same as input amount
		return {
			amountOut: amountIn,
			txReceipt: receipt,
		}
	}
}
