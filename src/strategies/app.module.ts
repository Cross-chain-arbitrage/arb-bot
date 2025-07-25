import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BridgeModule } from '../bridges/bridge.module'
import { DexModule } from '../dex/dex.module'
import { GraphBuilder } from '../graphs/GraphBuilder'
import { GraphExecutor } from '../graphs/GraphExecutor'
import { GraphVisualizer } from '../graphs/GraphVisualizer'
import { TgArbitrageNotifier } from '../modules/notification/TgArbitrageNotifier'
import { TgBalancesNotifier } from '../modules/notification/TgBalancesNotifier'
import { PriceOracleModule } from '../modules/price-oracle/price-oracle.module'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { ChainClientService } from '../utils/ChainClientService'
import { loadConfig } from './configuration'
import { Strategy } from './Strategy'

@Module({
	imports: [
		DexModule.forRoot(),
		BridgeModule,
		PriceOracleModule,
		ConfigModule.forRoot({
			load: [loadConfig],
		}),
	],
	providers: [
		GraphBuilder,
		ChainClientService,
		TokenUtils,
		TgArbitrageNotifier,
		TgBalancesNotifier,
		GraphVisualizer,
		GraphExecutor,
		Strategy,
	],
})
export class AppModule {}
