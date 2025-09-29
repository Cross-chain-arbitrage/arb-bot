import { Injectable } from '@nestjs/common'
import { TransactionReceipt } from 'viem'
import {
	CrosschainConfirmation,
	CrosschainExecution,
	CrosschainExecutor,
} from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { TokenValuator } from '../../../application/use-cases/token-valuator/token-valuator'
import { Edge } from '../../../domain/entities/edge'
import { ChainClientService } from '../../evm/chain-client/chain-client.service'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { FuseBridgeService } from '../../layerzero-bridges/fuse-bridge/fuse-bridge.service'
import { EvmTxCostHelper } from '../shared-helpers/chain-specific/evm/evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { FUSE_BRIDGE_PROTOCOL } from './constants'

@Injectable()
export class FuseBridgeExecutorPlugin
	extends EdgeHandler
	implements ExecutorPlugin
{
	constructor(
		private readonly fuseBridgeService: FuseBridgeService,
		private readonly evmTxCostHelper: EvmTxCostHelper,
		private readonly chainClientService: ChainClientService,
		private readonly tokenValuator: TokenValuator,
	) {
		super(FUSE_BRIDGE_PROTOCOL)
	}

	buildEdgeExecutor(edge: Edge<Token | NativeCurrency>): CrosschainExecutor {
		return {
			kind: 'crosschain',
			edge,
			execute: (amountIn: bigint) => this.execute(edge, amountIn),
		}
	}

	async execute(
		edge: Edge<Token | NativeCurrency>,
		amountIn: bigint,
	): Promise<CrosschainExecution> {
		const result = await this.fuseBridgeService.bridge(
			edge.from,
			edge.to,
			amountIn,
		)

		return {
			srcTxId: result.bridgeTx.srcTxHash,
			confirm: () => this.confirm(edge, result, amountIn),
		}
	}

	async confirm(
		edge: Edge<Token | NativeCurrency>,
		bridgeResult: Awaited<ReturnType<typeof this.fuseBridgeService.bridge>>,
		amountIn: bigint,
	): Promise<CrosschainConfirmation> {
		const bridgeTx = bridgeResult.bridgeTx

		const srcChainClient = this.chainClientService.getClient(
			edge.from.chainId,
		)

		const srcTxReceipt = await srcChainClient.waitForTransactionReceipt({
			hash: bridgeTx.srcTxHash,
		})

		if (srcTxReceipt.status === 'reverted') {
			return {
				status: 'failed',
				reason: 'Source transaction reverted',
				getExecutionCost: () =>
					this.getFailedExecutionCost(edge, srcTxReceipt),
			}
		}

		await bridgeTx.waitForBridgeToFinish()

		if (!bridgeTx.dstTxHash) {
			throw new Error('No destination transaction found')
		}

		// TODO: retrieve amount out from dst tx, because decimals could be different
		return {
			dstTxId: bridgeTx.dstTxHash,
			amountOut: amountIn,
			status: 'success',
			getExecutionCost: () =>
				this.getSuccessExecutionCost(edge, srcTxReceipt, bridgeResult),
		}
	}

	async getFailedExecutionCost(
		edge: Edge<Token | NativeCurrency>,
		srcTxReceipt: TransactionReceipt,
	) {
		const txCostInUsd = await this.evmTxCostHelper.getTxCostInUsd(
			edge.from.chainId,
			srcTxReceipt,
		)

		return {
			costInUsd: txCostInUsd,
		}
	}

	async getSuccessExecutionCost(
		edge: Edge<Token | NativeCurrency>,
		srcTxReceipt: TransactionReceipt,
		bridgeResult: Awaited<ReturnType<typeof this.fuseBridgeService.bridge>>,
	) {
		const txCostInUsd = await this.evmTxCostHelper.getTxCostInUsd(
			edge.from.chainId,
			srcTxReceipt,
		)

		const bridgeFeeInUsd =
			await this.tokenValuator.estimateUsdFromTokenAmount(
				bridgeResult.lzFee.underlyingToken,
				bridgeResult.lzFee.amount,
			)

		return {
			costInUsd: txCostInUsd + bridgeFeeInUsd,
		}
	}
}
