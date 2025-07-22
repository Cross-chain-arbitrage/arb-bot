import { Module } from '@nestjs/common'
import { PoolCreator } from './base/PoolCreator'
import { PoolUtils } from './PoolUtils'
import { DEX_REGISTRY_TOKEN, DexRegistry } from './poolVariety'

const poolCreators = Object.values(DexRegistry)

@Module({
	providers: [
		PoolUtils,
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
	],
	exports: [PoolUtils],
})
export class DexModule {}
