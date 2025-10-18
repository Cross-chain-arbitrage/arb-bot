import { Injectable } from '@nestjs/common'
import { Graph } from '../../../../domain/entities/graph'
import { BellmanFord } from '../../../../domain/services/bellman-ford'
import { QuotedPath } from '../../../../domain/value-objects/path'
import {
	ParamsFindCycle,
	ParamsFindPath,
	PathFinder,
} from '../../../interfaces/path-finder'
import { GraphSnapshotBuilder } from '../graph-snapshot-builder/gpaph-snapshot-builder'

@Injectable()
export class SnapshotPathFinder implements PathFinder {
	constructor(private readonly graphSnapshotBuilder: GraphSnapshotBuilder) {}

	async findPaths(
		graph: Graph,
		params: ParamsFindPath[],
	): Promise<QuotedPath[] | null> {
		const paths: QuotedPath[] = []

		for (const param of params) {
			const { startToken, endToken, startAmount } = param

			const graphSnapshot =
				await this.graphSnapshotBuilder.buildSnapshot(graph)

			if (startToken.id === endToken.id) {
				paths.push({
					quotedStepSequence: [],
					startAmount,
					endAmount: startAmount,
				})
			}

			const path = BellmanFord.findPath(
				startToken,
				endToken,
				startAmount,
				graphSnapshot,
			)

			if (path !== null) {
				paths.push(path)
			}
		}

		if (paths.length === 0) {
			return null
		}

		return paths
	}

	async findNegativeSumCycles(
		graph: Graph,
		params: ParamsFindCycle[],
	): Promise<QuotedPath[] | null> {
		const cycles: QuotedPath[] = []

		for (const param of params) {
			const { startToken, startAmount } = param

			const graphSnapshot =
				await this.graphSnapshotBuilder.buildSnapshot(graph)

			const cycle = BellmanFord.findNegativeSumCycle(
				startToken,
				startAmount,
				graphSnapshot,
			)

			if (cycle !== null) {
				cycles.push(cycle)
			}
		}
		return cycles
	}
}
