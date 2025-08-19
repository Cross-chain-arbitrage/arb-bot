import { GraphBuilderPlugin } from '../../../application/interfaces/graph-plugin'
import { Pool } from '../../dex/base/pool'

export class DexGraphPlugin implements GraphBuilderPlugin {
	edgeIdToPool: Record<string, Pool> = {}
	name = 'dex'
}
