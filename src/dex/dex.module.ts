import { DynamicModule, Module } from '@nestjs/common'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { ChainClientService } from '../utils/ChainClientService'
import { PoolCreator } from './base/PoolCreator'
import { DEX_REGISTRY_TOKEN, DexRegistry } from './DexRegistry'
import { PoolUtils } from './PoolUtils'

@Module({})
export class DexModule {
	static forRoot(): DynamicModule {
		const poolCreators = Object.values(DexRegistry)

		return {
			module: DexModule,
			providers: [
				ChainClientService,
				TokenUtils,
				...poolCreators,
				{
					provide: DEX_REGISTRY_TOKEN,
					useFactory: (...poolCreators: PoolCreator[]) => {
						const registry: Record<string, PoolCreator> = {}

						const keys = Object.keys(DexRegistry)

						keys.forEach((key, index) => {
							registry[key] = poolCreators[index]
						})

						return registry
					},
					inject: poolCreators,
				},
				PoolUtils,
			],
			exports: [PoolUtils],
		}
	}
}

// async function main() {
// 	const app = await NestFactory.createApplicationContext(DexModule.forRoot())
// 	const poolUtils = app.get(PoolUtils)
// 	const pool = await poolUtils.createPool(
// 		'0x6f96c6f73147db99716a0328eda2b6bff136cdb8',
// 		swellchain.id,
// 		'VELODROME_V2',
// 	)
// 	console.log(pool.token0.symbol)
// 	console.log(pool.token1.symbol)
// }

// void main()
