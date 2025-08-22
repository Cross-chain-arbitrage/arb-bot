import { Injectable, Module } from '@nestjs/common'
import { Edge, EdgeId } from '../../../domain/entities/edge'
import { Pool } from '../../dex/base/pool'

@Injectable()
export class EdgeToPoolRegistry {
	edgeToPool: Map<EdgeId, Pool> = new Map()

	constructor() {}

	registerEdge(edge: Edge, pool: Pool) {
		this.edgeToPool.set(edge.id, pool)
	}

	getPool(edge: Edge): Pool {
		const pool = this.edgeToPool.get(edge.id)

		if (!pool) {
			throw new Error(`Pool not found for edge ${edge.id}`)
		}

		return pool
	}
}

@Module({
	providers: [EdgeToPoolRegistry],
	exports: [EdgeToPoolRegistry],
})
export class EdgeToPoolRegistryModule {}
