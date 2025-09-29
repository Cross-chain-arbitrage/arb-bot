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
import { StargateService } from '../../layerzero-bridges/stargate/stargate-service'
import { EvmTxCostHelper } from '../shared-helpers/chain-specific/evm/evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { STARGATE_PROTOCOL } from './constants'

@Injectable()
export class StargateExecutorPlugin
	extends EdgeHandler
	implements ExecutorPlugin
{
	constructor(
		private readonly stargateService: StargateService,
		readonly evmTxCostHelper: EvmTxCostHelper,
		readonly tokenValuator: TokenValuator,
		readonly chainClientService: ChainClientService,
	) {
		super(STARGATE_PROTOCOL)
	}

	buildEdgeExecutor(edge: Edge<Token | NativeCurrency>): CrosschainExecutor {
		return {
			kind: 'crosschain',
			edge,
			execute: this.execute.bind(this, edge),
		}
	}

	async execute(
		edge: Edge<Token | NativeCurrency>,
		amountIn: bigint,
	): Promise<CrosschainExecution> {
		const bridgeResult = await this.stargateService.bridge(
			edge.from,
			edge.to,
			amountIn,
		)

		return {
			srcTxId: bridgeResult.bridgeTx.srcTx.hash,
			confirm: () => this.confirm(edge, bridgeResult),
		}
	}

	async confirm(
		edge: Edge<Token | NativeCurrency>,
		bridgeResult: Awaited<ReturnType<typeof this.stargateService.bridge>>,
	): Promise<CrosschainConfirmation> {
		const bridgeTx = bridgeResult.bridgeTx

		const srcChainClient = this.chainClientService.getClient(
			edge.from.chainId,
		)
		const srcTxReceipt = await srcChainClient.waitForTransactionReceipt({
			hash: bridgeTx.srcTx.hash,
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

		if (!bridgeTx.dstTx) {
			throw new Error('No destination transaction found')
		}

		return {
			dstTxId: bridgeTx.dstTx.hash,
			amountOut: bridgeResult.amountOut,
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
		bridgeResult: Awaited<ReturnType<typeof this.stargateService.bridge>>,
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
