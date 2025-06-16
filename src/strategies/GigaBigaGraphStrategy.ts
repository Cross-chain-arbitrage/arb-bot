import { Pool } from '../dex/Pool'
import { PoolUtils } from '../dex/PoolUtils'
import { Graph } from '../graphs/Graph'
import { GraphBuilder } from '../graphs/GraphBuilder'
import { poolsByChain } from '../pools'

/* ============ Constants ============ */

const SLIPPAGE = 50

/* ============ Strategy ============ */
export class GigaBigaStrategySetup {
	static async setup(): Promise<Graph> {
		const poolPromises: Promise<Pool>[] = []

		for (const chainId in poolsByChain) {
			const pools = poolsByChain[chainId]

			for (const pool of pools) {
				const poolPromise = PoolUtils.createPool(
					pool.address,
					Number(chainId),
					pool.type,
				)

				poolPromises.push(poolPromise)
			}
		}

		const pools = await Promise.all(poolPromises)

		return await GraphBuilder.buildFromPools(pools, SLIPPAGE)
	}
}
