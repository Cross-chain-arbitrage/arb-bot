import { DynamicModule, Module } from '@nestjs/common'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { ChainClientService } from '../utils/ChainClientService'
import { PoolCreator } from './base/PoolCreator'
import { DEX_REGISTRY_TOKEN, DexRegistry } from './DexRegistry'
import { PoolUtils } from './PoolUtils'
import { VelodromeV2PoolCreator } from './protocols/Velodrome/VelodromeV2/PoolCreator'

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
				VelodromeV2PoolCreator,
				{
					provide: DEX_REGISTRY_TOKEN,
					useFactory: (...poolCreators: PoolCreator[]) => {
						const registry: Record<string, PoolCreator> = {}

						const keys = Object.keys(DexRegistry)

						keys.forEach((key, index) => {
							registry[key] = poolCreators[index]
						})

						console.log(Object.values(registry))
						console.log(poolCreators)

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
