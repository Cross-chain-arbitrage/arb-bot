import { CacheModule } from '@nestjs/cache-manager'
import { Logger, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { BridgeModule } from './bridges/bridge.module'
import { ChainClientModule } from './chain-client/chain-client.module'
import { DexModule } from './dex/dex.module'
import { GasPriceOracleService } from './gas-price-oracle/gas-price-oracle.service'
import { GraphBuilder } from './graphs/GraphBuilder'
import { GraphExecutor } from './graphs/GraphExecutor'
import { GraphVisualizer } from './graphs/GraphVisualizer'
import { EdgeHelperService } from './graphs/primitives/edges/edge-helper.service'
import { TgArbitrageNotifier } from './modules/notification/TgArbitrageNotifier'
import { TgBalancesNotifier } from './modules/notification/TgBalancesNotifier'
import { PriceOracleModule } from './modules/price-oracle/price-oracle.module'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { SolanaClientService } from './solana/solana-client.service'
import { SolanaTokenUtils } from './solana/solana-tokens/solana-token-utils'
import { loadConfig } from './strategies/configuration'
import { Strategy } from './strategies/Strategy'
import { transport } from './utils/logging-config'

const appConfig = loadConfig()

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
		ConfigModule.forRoot({
			load: [loadConfig],
			isGlobal: true,
		}),
		ChainClientModule.forRoot(appConfig.chainClientConfig),
		DexModule.forRoot(),
		BridgeModule,
		PriceOracleModule,
		CacheModule.register(),
	],
	providers: [
		GraphBuilder,
		TokenUtils,
		TgArbitrageNotifier,
		TgBalancesNotifier,
		GraphVisualizer,
		GraphExecutor,
		Strategy,
		Logger,
		EdgeHelperService,
		GasPriceOracleService,
		SolanaTokenUtils,
		SolanaClientService,
	],
})
export class AppModule {}
