import { Injectable } from '@nestjs/common'
import { ParsedTransactionWithMeta } from '@solana/web3.js'
import { TransactionReceipt } from 'viem'
import { poll } from '../../../../utils/polling'
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
import { TokenBase } from '../../evm/primitives/tokens/TokenBase'
import { SimpleStargateService } from '../../layerzero-bridges/stargate/simple-stargate.service'
import { SolanaClientService } from '../../solana/solana-client.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaEvmHelper } from '../shared/helpers/chain-specific/solana-evm/solana-evm-helper'
import { SolanaEvmTxCostHelper } from '../shared/helpers/chain-specific/solana-evm/solana-evm-tx-cost-helper'
import { EdgeHandler } from '../shared/implementations/edge-handler'
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
		private readonly solanaClientService: SolanaClientService,
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

	private async execute(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
		amountIn: bigint,
	): Promise<CrosschainExecution> {
		const from = edge.from

		if (from instanceof TokenBase) return this.executeBridge(edge, amountIn)

		const finalizedBalance = await from.balanceOf(
			this.solanaClientService.walletAddress,
			'finalized',
		)

		if (finalizedBalance >= amountIn)
			return this.executeBridge(edge, amountIn)

		const confirmedBalance = await from.balanceOf(
			this.solanaClientService.walletAddress,
			'confirmed',
		)

		if (confirmedBalance < amountIn)
			throw new Error(
				`No enough balance, need ${amountIn}, has ${confirmedBalance}`,
			)

		await this.waitBalanceFinalization(from, amountIn)

		return this.executeBridge(edge, amountIn)
	}

	private async waitBalanceFinalization(token: SolanaToken, amount: bigint) {
		await poll(
			() =>
				token.balanceOf(
					this.solanaClientService.walletAddress,
					'finalized',
				),
			(balance) => balance >= amount,
			1000,
			20000,
			new Error(
				`Finalized amount is still low then required (required: ${amount})`,
			),
		)
	}

	private async executeBridge(
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

	private async confirm(
		edge: Edge<SolanaToken | Token | NativeCurrency>,
		bridgeResult: Awaited<
			ReturnType<typeof this.simpleStargateService.bridge>
		>,
	): Promise<CrosschainConfirmation> {
		const chainId = TokenIdUtils.parseId(edge.from.id).chainId

		const srcTxRes = await this.solanaEvmHelper.waitForTxResult(
			chainId,
			bridgeResult.txHash,
		)
		//TODO: handle failed tx

		const awaitedBridge = await bridgeResult.waitForBridge()

		const dstTxId = awaitedBridge.dstTxHash

		if (!dstTxId) {
			throw new Error('Destination transaction not found')
		}

		return {
			status: 'success',
			dstTxId,
			amountOut: bridgeResult.amountOut,
			getExecutionCost: async () => {
				return await this.getSuccessExecutionCost(
					edge,
					srcTxRes,
					bridgeResult,
				)
			},
		}
	}

	async getFailedExecutionCost(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
		txResult: TransactionReceipt | ParsedTransactionWithMeta,
	) {
		const chainId = TokenIdUtils.parseId(edge.from.id).chainId

		const txCostInUsd = await this.solanaEvmTxCostHelper.getTxCostInUsd(
			chainId,
			txResult,
		)

		return {
			costInUsd: txCostInUsd,
		}
	}

	async getSuccessExecutionCost(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
		srcTxReceipt: TransactionReceipt | ParsedTransactionWithMeta,
		bridgeResult: Awaited<
			ReturnType<typeof this.simpleStargateService.bridge>
		>,
	) {
		const chainId = TokenIdUtils.parseId(edge.from.id).chainId

		const txCostInUsd = await this.solanaEvmTxCostHelper.getTxCostInUsd(
			chainId,
			srcTxReceipt,
		)

		const bridgeFeeInUsd =
			await this.tokenValuator.estimateUsdFromTokenAmount(
				bridgeResult.lzFee.token,
				bridgeResult.lzFee.amount,
			)

		return {
			costInUsd: txCostInUsd + bridgeFeeInUsd,
		}
	}
}
