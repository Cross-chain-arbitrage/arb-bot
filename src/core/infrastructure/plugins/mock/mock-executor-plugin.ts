import { Injectable } from '@nestjs/common'
import {
	CrosschainExecution,
	EdgeExecutor,
} from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Token } from '../../../domain/entities/token'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { MOCK_PROTOCOL } from './constants'

@Injectable()
export class MockExecutorPlugin extends EdgeHandler implements ExecutorPlugin {
	constructor() {
		super(MOCK_PROTOCOL)
	}

	buildEdgeExecutor(edge: Edge<Token>): Promise<EdgeExecutor> {
		return Promise.resolve({
			kind: 'crosschain',
			edge,
			execute: (amountIn: bigint) => this.execute(edge, amountIn),
		})
	}

	execute(edge: Edge<Token>, amountIn: bigint): Promise<CrosschainExecution> {
		throw new Error('Mock executor not implemented')
	}
}
