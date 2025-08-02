import { Logger, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { BridgeModule } from './bridges/bridge.module'
import { ChainClientService } from './chain-client/chain-client.service'
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
import { transport } from './utils/logging-config'

@Module({
	imports: [
		LoggerModule.forRoot({
			pinoHttp: {
				transport,
				formatters: {
					level(label, number) {
						return { level: label }
					},
				},
			},
		}),
		DexModule.forRoot(),
		BridgeModule,
		PriceOracleModule,
		ConfigModule.forRoot({
			load: [loadConfig],
			isGlobal: true,
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
		Logger,
	],
})
export class AppModule {}
