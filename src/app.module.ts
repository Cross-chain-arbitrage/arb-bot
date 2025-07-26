import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { BridgeModule } from './bridges/bridge.module'
import { DexModule } from './dex/dex.module'
import { GraphBuilder } from './graphs/GraphBuilder'
import { GraphExecutor } from './graphs/GraphExecutor'
import { GraphVisualizer } from './graphs/GraphVisualizer'
import { TgArbitrageNotifier } from './modules/notification/TgArbitrageNotifier'
import { TgBalancesNotifier } from './modules/notification/TgBalancesNotifier'
import { PriceOracleModule } from './modules/price-oracle/price-oracle.module'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { loadConfig } from './strategies/configuration'
import { Strategy } from './strategies/Strategy'
import { ChainClientService } from './utils/ChainClientService'

@Module({
	imports: [
		LoggerModule.forRoot({
			pinoHttp: {
				transport: {
					target: 'pino-pretty',
					options: {
						colorize: true,
					},
				},
			},
		}),
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
