import TTLCache from '@isaacs/ttlcache'
import { Hash } from 'viem'
import z from 'zod'
import { FuseBridge } from '../../bridges/FuseBridge/FuseBridge'
import { Relay } from '../../bridges/relay/Relay'
import { SimpleStargate } from '../../bridges/stargate/SimpleStargate'
import { Stargate } from '../../bridges/stargate/Stargate'
import { Pool } from '../../dex/base/Pool'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { TokenAmount } from '../../primitives/tokens/TokenAmount'
import { WrappedNative } from '../../primitives/tokens/WrappedNative'
import { ChainClientService } from '../../utils/ChainClientService'
import { shortenAddress } from '../../utils/common'
import { Graph } from './Graph'

export enum ActionType {
	SWAP = 'SWAP',
	STARGATE_BRIDGE = 'STARGATE_BRIDGE',
	FUSE_BRIDGE = 'FUSE_BRIDGE',
	RELAY_BRIDGE = 'RELAY_BRIDGE',
	WRAP = 'WRAP',
	UNWRAP = 'UNWRAP',
	SIMPLE_STARGATE_BRIDGE = 'SIMPLE_STARGATE_BRIDGE',
}

export abstract class Edge<T extends ActionType = ActionType> {
	abstract id: EdgeId

	lastQuote: EdgeQuoteResult | undefined

	constructor(
		readonly chainClientService: ChainClientService,
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
		chainClientService: ChainClientService,
		override readonly from: Token,
		override readonly to: Token,
		readonly pool: Pool,
		graph: Graph,
	) {
		super(chainClientService, from, to, ActionType.SWAP, graph)
		this.id = `${this.from.id}-${this.to.id}-${this.actionType}-${this.pool.address}`
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const { amountOut, gas } = await this.pool.quoteSwap({
			tokenIn: this.from,
			tokenOut: this.to,
			amountIn,
			slippage: 10n,
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

const feeSchema = z.object({
	currency: z.object({
		chainId: z.number(),
		address: z.string(),
	}),
	amount: z.string(),
})
const relayQuoteSchema = z.object({
	fees: z.object({
		gas: feeSchema,
		relayerGas: feeSchema,
		relayerService: feeSchema,
		app: feeSchema,
		relayer: feeSchema,
	}),
})

export class RelayBridgeEdge extends Edge<ActionType.RELAY_BRIDGE> {
	// amountOut = k * amountIn + b
	getRelayRateFunction(
		amountIn: bigint,
		relayQuote: z.infer<typeof relayQuoteSchema>,
		gas: bigint,
	) {
		const k =
			1 -
			(Number(relayQuote.fees.relayer.amount) +
				Number(relayQuote.fees.relayerService.amount)) /
				Number(amountIn)

		const b = -Number(relayQuote.fees.relayerGas.amount)

		return (amountIn: bigint) => {
			const amountOut = k * Number(amountIn) + b
			return {
				rate: this.calcRate(amountIn, BigInt(amountOut)),
				amountOut: BigInt(amountOut),
				gas: gas,
			}
		}
	}

	readonly id: EdgeId

	private rateFunction: TTLCache<
		'rateFunction',
		(amountIn: bigint) => { rate: number; amountOut: bigint; gas: bigint }
	>

	private pendingQuoteRequest: Promise<void> | null = null

	constructor(
		chainClientService: ChainClientService,
		readonly relay: Relay,
		override readonly from: GraphNode,
		override readonly to: GraphNode,
		graph: Graph,
		readonly rateFunctionTTL: number = 5000,
	) {
		super(chainClientService, from, to, ActionType.RELAY_BRIDGE, graph)
		this.id = `${this.from.id}-${this.to.id}-${this.actionType}`

		this.rateFunction = new TTLCache({
			ttl: this.rateFunctionTTL,
		})
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const cachedRateFunction = this.rateFunction.get('rateFunction')

		let rate: number
		let amountOut: bigint
		let gas: bigint

		if (cachedRateFunction) {
			;({ rate, amountOut, gas } = cachedRateFunction(amountIn))
		} else {
			// If there's already a pending request, wait for it to complete
			if (this.pendingQuoteRequest) {
				await this.pendingQuoteRequest

				// After waiting, check cache again
				const cachedRateFunctionAfterWait =
					this.rateFunction.get('rateFunction')
				if (cachedRateFunctionAfterWait) {
					;({ rate, amountOut, gas } =
						cachedRateFunctionAfterWait(amountIn))
				} else {
					throw new Error(
						'Rate function should be cached after pending request completion',
					)
				}
			} else {
				// Make the request and cache it for other concurrent calls
				this.pendingQuoteRequest =
					this.fetchAndCacheRateFunction(amountIn)

				try {
					await this.pendingQuoteRequest

					// Get the cached rate function that was just set
					const newCachedRateFunction =
						this.rateFunction.get('rateFunction')
					if (!newCachedRateFunction) {
						throw new Error(
							'Rate function should be cached after fetch',
						)
					}

					;({ rate, amountOut, gas } =
						newCachedRateFunction(amountIn))
				} finally {
					// Clear the pending request
					this.pendingQuoteRequest = null
				}
			}
		}

		return Promise.resolve({
			rate: rate,
			amountOut: amountOut,
			cost: {
				gas: gas,
			},
		})
	}

	private async fetchAndCacheRateFunction(amountIn: bigint): Promise<void> {
		const quote = await this.relay.quote(this.from, this.to, amountIn)
		const relayQuote = relayQuoteSchema.parse(quote.rawResult)

		this.rateFunction.set(
			'rateFunction',
			this.getRelayRateFunction(amountIn, relayQuote, quote.gasInNative),
		)
	}

	async execute(
		amountIn: bigint,
	): Promise<EdgeExecutionResult<ActionType.RELAY_BRIDGE>> {
		const result = await this.relay.bridge(this.from, this.to, amountIn)

		return {
			amountOut: result.amountOut,
			srcTxReceipt: result.srcTxReceipt,
			dstTxHash: result.dstTxHash,
			bridgeFee: new TokenAmount(this.chainClientService, this.from, 0n), //TODO: remove useless returning 0
		}
	}
}

export class FuseBridgeEdge extends Edge<ActionType.FUSE_BRIDGE> {
	readonly id: EdgeId

	constructor(
		chainClientService: ChainClientService,
		readonly fuseBridge: FuseBridge,
		override readonly from: GraphNode,
		override readonly to: GraphNode,
		graph: Graph,
	) {
		super(chainClientService, from, to, ActionType.FUSE_BRIDGE, graph)
		this.id = `${this.from.id}-${this.to.id}-${this.actionType}`
	}

	async execute(
		amountIn: bigint,
	): Promise<EdgeExecutionResult<ActionType.FUSE_BRIDGE>> {
		const { bridgeTx, lzFee } = await this.fuseBridge.bridge(
			this.from as Token,
			this.to.chainId,
			this.chainClientService.getWalletClient(this.to.chainId).account
				.address,
			amountIn,
		)

		const srcTxReceipt = await this.chainClientService
			.getClient(this.from.chainId)
			.waitForTransactionReceipt({ hash: bridgeTx.srcTxHash as Hash })

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
		const { amountOut, lzFee, gas } = await this.fuseBridge.quoteBridge(
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
		chainClientService: ChainClientService,
		override readonly from: GraphNode,
		override readonly to: GraphNode,
		override readonly actionType: T,
		graph: Graph,
	) {
		super(chainClientService, from, to, actionType, graph)
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
		chainClientService: ChainClientService,
		override readonly from: NativeCurrency,
		override readonly to: Token,
		graph: Graph,
	) {
		super(chainClientService, from, to, ActionType.WRAP, graph)
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
		chainClientService: ChainClientService,
		override readonly from: Token,
		override readonly to: NativeCurrency,
		graph: Graph,
	) {
		super(chainClientService, from, to, ActionType.UNWRAP, graph)
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

export class StargateBridgeEdge extends Edge<ActionType.STARGATE_BRIDGE> {
	readonly id: EdgeId

	constructor(
		chainClientService: ChainClientService,
		readonly stargate: Stargate,
		override readonly from: GraphNode,
		override readonly to: GraphNode,
		graph: Graph,
	) {
		super(chainClientService, from, to, ActionType.STARGATE_BRIDGE, graph)
		this.id = `${this.from.id}-${this.to.id}-${this.actionType}`
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const { amountOut, lzFee, gas } = await this.stargate.quoteBridge(
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
		const result = await this.stargate.bridge(
			this.from,
			this.to.chainId,
			this.chainClientService.getWalletClient(this.from.chainId).account
				.address,
			amountIn,
		)

		const srcTxReceipt = await this.chainClientService
			.getClient(this.from.chainId)
			.waitForTransactionReceipt({
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

export class SimpleStargateBridgeEdge extends Edge<ActionType.SIMPLE_STARGATE_BRIDGE> {
	readonly id: EdgeId

	constructor(
		chainClientService: ChainClientService,
		readonly simpleStargate: SimpleStargate,
		override readonly from: GraphNode,
		override readonly to: GraphNode,
		graph: Graph,
	) {
		super(
			chainClientService,
			from,
			to,
			ActionType.SIMPLE_STARGATE_BRIDGE,
			graph,
		)
		this.id = `${this.from.id}-${this.to.id}-${this.actionType}`
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const { amountOut, lzFee, gas } = await this.simpleStargate.quote(
			this.from,
			this.to,
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

	async execute(
		amountIn: bigint,
	): Promise<EdgeExecutionResult<ActionType.SIMPLE_STARGATE_BRIDGE>> {
		const result = await this.simpleStargate.bridge(
			this.from,
			this.to,
			amountIn,
		)

		const srcTxReceipt = await this.chainClientService
			.getClient(this.from.chainId)
			.waitForTransactionReceipt({
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
