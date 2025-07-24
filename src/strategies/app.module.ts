import { Module } from '@nestjs/common'
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

@Module({
	imports: [DexModule.forRoot(), BridgeModule, PriceOracleModule],
	providers: [
		GraphBuilder,
		ChainClientService,
		TokenUtils,
		TgArbitrageNotifier,
		TgBalancesNotifier,
		GraphVisualizer,
		GraphExecutor,
	],
})
export class AppModule {}
