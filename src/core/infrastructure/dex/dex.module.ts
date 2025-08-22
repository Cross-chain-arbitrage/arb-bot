import { Module } from '@nestjs/common'
import { EvmModule } from '../evm/evm.module'
import { PoolCreator } from './base/pool-creator'
import { DEX_REGISTRY_TOKEN, DexRegistry } from './dex-registry'
import { PoolType, PoolUtils } from './pool-utils'

const allPoolCreatorClasses = Object.values(DexRegistry)
const dexNames = Object.keys(DexRegistry) as PoolType[]

/**
 * Goals for this module:
 * 1) Provide type hints in PoolUtils.createPool when passing poolType
 * 2) Minimize boilerplate code
 *
 * Implementation:
 * 1) Single registry maps all pool creators to their names for PoolUtils
 * 2) Factory pattern creates the DEX_REGISTRY_TOKEN
 */
@Module({
	imports: [EvmModule],
	providers: [
		PoolUtils,
		...allPoolCreatorClasses,
		{
			provide: DEX_REGISTRY_TOKEN,
			inject: allPoolCreatorClasses,
			// DexRegistry contains classes, but we need their instances
			useFactory: (...poolCreatorInstances: PoolCreator[]) => {
				const registry: Record<string, PoolCreator> = {}

				dexNames.forEach((dexName, index) => {
					const poolCreatorClass = allPoolCreatorClasses[index]

					// Find the instance that matches this class
					const poolCreatorInstance = poolCreatorInstances.find(
						(poolCreatorInstance) =>
							poolCreatorInstance.constructor.name ===
							poolCreatorClass.name,
					)

					if (!poolCreatorInstance) {
						throw new Error(
							`Pool creator instance not found for ${poolCreatorClass.name}`,
						)
					}

					registry[dexName] = poolCreatorInstance
				})

				return registry
			},
		},
	],
	exports: [PoolUtils],
})
export class DexModule {}

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
