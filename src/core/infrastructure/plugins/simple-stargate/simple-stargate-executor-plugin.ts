import { Injectable } from '@nestjs/common'
import {
	CrosschainConfirmation,
	CrosschainExecution,
	CrosschainExecutor,
} from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { TokenValuator } from '../../../application/use-cases/token-valuator/token-valuator'
import { Edge } from '../../../domain/entities/edge'
import { TokenIdUtils } from '../../../domain/services/token-id-utils'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { SimpleStargateService } from '../../layerzero-bridges/stargate/simple-stargate.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaEvmHelper } from '../shared-helpers/chain-specific/solana-evm/solana-evm-helper'
import { SolanaEvmTxCostHelper } from '../shared-helpers/chain-specific/solana-evm/solana-evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { SIMPLE_STARGATE_PROTOCOL } from './constants'

@Injectable()
export class SimpleStargateExecutorPlugin
	extends EdgeHandler
	implements ExecutorPlugin
{
	constructor(
		readonly simpleStargateService: SimpleStargateService,
		readonly solanaEvmTxCostHelper: SolanaEvmTxCostHelper,
		readonly tokenValuator: TokenValuator,
		readonly solanaEvmHelper: SolanaEvmHelper,
	) {
		super(SIMPLE_STARGATE_PROTOCOL)
	}

	buildEdgeExecutor(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
	): CrosschainExecutor {
		return {
			kind: 'crosschain',
			edge,
			execute: this.execute.bind(this, edge),
		}
	}

	async execute(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
		amountIn: bigint,
	): Promise<CrosschainExecution> {
		const result = await this.simpleStargateService.bridge(
			edge.from,
			edge.to,
			amountIn,
		)

		return {
			srcTxId: result.txHash,
			confirm: this.confirm.bind(this, edge, result),
		}
	}

	async confirm(
		edge: Edge<SolanaToken | Token | NativeCurrency>,
		bridgeResult: Awaited<
			ReturnType<typeof this.simpleStargateService.bridge>
		>,
	): Promise<CrosschainConfirmation> {
		const awaitedBridge = await bridgeResult.waitForBridge()

		const dstTxId = awaitedBridge.dstTxHash

		if (!dstTxId) {
			throw new Error('Destination transaction not found')
		}

		const chainId = TokenIdUtils.parseId(edge.from.id).chainId

		const parsedTx = await this.solanaEvmHelper.waitForTxResult(
			chainId,
			bridgeResult.txHash,
		)

		return {
			status: 'success',
			dstTxId,
			amountOut: bridgeResult.amountOut,
			getExecutionCost: async () => {
				const costInUsd =
					await this.solanaEvmTxCostHelper.getTxCostInUsd(
						chainId,
						parsedTx,
					)

				return {
					costInUsd,
				}
			},
		}
	}
}
