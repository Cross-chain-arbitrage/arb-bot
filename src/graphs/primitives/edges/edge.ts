import { Cache } from '@nestjs/cache-manager'

export abstract class Edge {
	abstract id: EdgeId

	lastQuote: EdgeQuoteResult | undefined

	constructor(
		readonly from: GraphNode,
		readonly to: GraphNode,
		readonly cacheService: Cache,
	) {}

	async getRate(amountIn: bigint): Promise<GetRateResult> {
		const cachedRate = await this.cacheService.get<GetRateResult>(
			`${this.id}-${amountIn.toString()}`,
		)
		if (cachedRate) return cachedRate

		const quoteResult = await this.quote(amountIn)

		this.lastQuote = quoteResult

		await this.cacheService.set(
			`${this.id}-${amountIn.toString()}`,
			quoteResult,
		)

		return quoteResult
	}

	abstract quote(amountIn: bigint): Promise<EdgeQuoteResult>

	abstract execute(
		amountIn: bigint,
	): Promise<InchainEdgeExecutionResult | CrosschainEdgeExecutionResult>

	abstract approve(): Promise<(string | undefined)[]>

	protected calcRate(amountIn: bigint, amountOut: bigint) {
		return -Math.log(Number(amountOut) / Number(amountIn))
	}
}

// export class SimpleStargateBridgeEdge extends Edge<ActionType.SIMPLE_STARGATE_BRIDGE> {
// 	readonly id: EdgeId

// 	constructor(
// 		chainClientService: ChainClientService,
// 		readonly simpleStargate: SimpleStargateService,
// 		override readonly from: GraphNode,
// 		override readonly to: GraphNode,
// 		graph: Graph,
// 	) {
// 		super(
// 			chainClientService,
// 			from,
// 			to,
// 			ActionType.SIMPLE_STARGATE_BRIDGE,
// 			graph,
// 		)
// 		this.id = `${this.from.id}-${this.to.id}-${this.actionType}`
// 	}

// 	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
// 		const { amountOut, lzFee, gas } = await this.simpleStargate.quote(
// 			this.from,
// 			this.to,
// 			amountIn,
// 		)

// 		const rate = this.calcRate(amountIn, amountOut)

// 		return {
// 			rate,
// 			amountOut,
// 			cost: {
// 				gas,
// 				bridgeFee: lzFee,
// 			},
// 		}
// 	}

// 	async execute(
// 		amountIn: bigint,
// 	): Promise<EdgeExecutionResult<ActionType.SIMPLE_STARGATE_BRIDGE>> {
// 		const result = await this.simpleStargate.bridge(
// 			this.from,
// 			this.to,
// 			amountIn,
// 		)

// 		const srcTxReceipt = await this.chainClientService
// 			.getClient(this.from.chainId)
// 			.waitForTransactionReceipt({
// 				hash: result.bridgeTx.srcTxHash,
// 			})

// 		const message = await result.bridgeTx.waitForBridgeToFinish()

// 		return {
// 			amountOut: result.amountOut,
// 			srcTxReceipt,
// 			dstTxHash: message.dstTxHash as Hash,
// 			bridgeFee: result.lzFee,
// 		}
// 	}
// }

// export class GasZipBridgeEdge extends Edge<ActionType.GAS_ZIP_BRIDGE> {
// 	readonly id: EdgeId

// 	constructor(
// 		chainClientService: ChainClientService,
// 		private readonly gasZipBridge: GasZipBridge,
// 		override readonly from: GraphNode,
// 		override readonly to: GraphNode,
// 		graph: Graph,
// 	) {
// 		super(chainClientService, from, to, ActionType.GAS_ZIP_BRIDGE, graph)
// 		this.id = `${this.from.id}-${this.to.id}-${this.actionType}`
// 	}

// 	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
// 		const { expected: amountOut, gas } = await this.gasZipBridge.quote(
// 			this.from as NativeCurrency,
// 			this.to as NativeCurrency,
// 			amountIn,
// 		)

// 		const rate = this.calcRate(amountIn, amountOut)

// 		// fee on dst is not accounted for
// 		// actual amountOut will be less for dstBridgeTxCost * 1.2
// 		return {
// 			rate,
// 			amountOut,
// 			cost: {
// 				gas: BigInt(gas),
// 			},
// 		}
// 	}

// 	async execute(
// 		amountIn: bigint,
// 	): Promise<EdgeExecutionResult<ActionType.GAS_ZIP_BRIDGE>> {
// 		const bridgeTx = await this.gasZipBridge.bridge(
// 			this.from as NativeCurrency,
// 			this.to as NativeCurrency,
// 			amountIn,
// 		)

// 		const srcTxReceipt = await this.chainClientService
// 			.getClient(this.from.chainId)
// 			.waitForTransactionReceipt({
// 				hash: bridgeTx.srcTxHash,
// 			})

// 		await bridgeTx.waitForBridgeToFinish()

// 		return {
// 			amountOut: bridgeTx.amountOut!,
// 			srcTxReceipt,
// 			dstTxHash: bridgeTx.dstTx?.hash as Hash,
// 			bridgeFee: new TokenAmount(this.chainClientService, this.from, 0n), //TODO: remove useless returning 0
// 		}
// 	}
// }
