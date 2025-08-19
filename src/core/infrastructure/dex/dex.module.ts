import { DynamicModule, Module } from '@nestjs/common'
import { ChainClientModule } from '../../../chain-client/chain-client.module'
import { TokenUtils } from '../evm/primitives/tokens/TokenUtils'
import { PoolCreator } from './base/pool-creator'
import { DEX_REGISTRY_TOKEN, DexRegistry } from './dex-registry'
import { PoolUtils } from './pool-utils'

@Module({})
export class DexModule {
	static forRoot(): DynamicModule {
		const poolCreators = Object.values(DexRegistry)

		return {
			imports: [ChainClientModule],
			module: DexModule,
			providers: [
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
