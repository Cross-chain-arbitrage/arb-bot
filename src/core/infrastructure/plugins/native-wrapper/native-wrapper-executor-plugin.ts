import { Injectable } from '@nestjs/common'
import { TransactionReceipt } from 'viem'
import {
	EdgeExecutor,
	InchainConfirmation,
	InchainExecution,
} from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { ChainClientService } from '../../evm/chain-client/chain-client.service'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { WrappedNative } from '../../evm/primitives/tokens/WrappedNative'
import { EvmTxCostHelper } from '../shared/helpers/chain-specific/evm/evm-tx-cost-helper'
import { EdgeHandler } from '../shared/implementations/edge-handler'
import { NATIVE_WRAPPER_PROTOCOL } from './constants'

@Injectable()
export class NativeWrapperExecutorPlugin
	extends EdgeHandler
	implements ExecutorPlugin
{
	constructor(
		private readonly chainClientService: ChainClientService,
		private readonly evmTxCostHelper: EvmTxCostHelper,
	) {
		super(NATIVE_WRAPPER_PROTOCOL)
	}

	async buildEdgeExecutor(
		edge: Edge<NativeCurrency | WrappedNative>,
	): Promise<EdgeExecutor> {
		const edgeExecutor = {
			kind: 'inchain',
			edge,
			execute: (amountIn: bigint) => this.execute(edge, amountIn),
		} as const

		return Promise.resolve(edgeExecutor)
	}

	async execute(
		edge: Edge<NativeCurrency | WrappedNative>,
		amountIn: bigint,
	): Promise<InchainExecution> {
		if (
			edge.from instanceof NativeCurrency &&
			edge.to instanceof WrappedNative
		) {
			return this.executeWrap(edge.to, amountIn)
		}

		if (
			edge.from instanceof WrappedNative &&
			edge.to instanceof NativeCurrency
		) {
			return this.executeUnwrap(edge.from, amountIn)
		}

		throw new Error(
			'Invalid edge, from must be NativeCurrency and to must be WrappedNative or vice versa',
		)
	}

	async executeWrap(
		to: WrappedNative,
		amountIn: bigint,
	): Promise<InchainExecution> {
		const txId = await to.deposit(amountIn)

		return {
			txId,
			confirm: () => this.confirm(txId, to.chainId, amountIn),
		}
	}

	async executeUnwrap(
		from: WrappedNative,
		amountIn: bigint,
	): Promise<InchainExecution> {
		const txId = await from.withdraw(amountIn)

		return {
			txId,
			confirm: () => this.confirm(txId, from.chainId, amountIn),
		}
	}

	async confirm(
		txHash: Bytes,
		chainId: number,
		amountIn: bigint,
	): Promise<InchainConfirmation> {
		const chainClient = this.chainClientService.getClient(chainId)

		const receipt = await chainClient.waitForTransactionReceipt({
			hash: txHash,
		})

		if (receipt.status === 'reverted') {
			return {
				status: 'failed',
				reason: 'Transaction reverted',
				getExecutionCost: () => this.getExecutionCost(receipt, chainId),
			}
		}

		return {
			status: 'success',
			amountOut: amountIn,
			getExecutionCost: () => this.getExecutionCost(receipt, chainId),
		}
	}

	async getExecutionCost(
		transactionReceipt: TransactionReceipt,
		chainId: number,
	) {
		const txCostInUsd = await this.evmTxCostHelper.getTxCostInUsd(
			chainId,
			transactionReceipt,
		)

		return {
			costInUsd: txCostInUsd,
		}
	}
}
