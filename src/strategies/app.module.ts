import { Module } from '@nestjs/common'
import { FuseBridge } from '../bridges/FuseBridge/FuseBridge'
import { Relay } from '../bridges/relay/Relay'
import { SimpleStargate } from '../bridges/stargate/SimpleStargate'
import { Stargate } from '../bridges/stargate/Stargate'
import { StargateAPI } from '../bridges/stargate/StargateAPI'
import { LayerZeroScanAPI } from '../dataApi/layerzeroscan/LayerZeroScanAPI'
import { DexModule } from '../dex/dex.module'
import { GraphBuilder } from '../graphs/GraphBuilder'
import { GraphExecutor } from '../graphs/GraphExecutor'
import { GraphVisualizer } from '../graphs/GraphVisualizer'
import { TgArbitrageNotifier } from '../modules/notification/TgArbitrageNotifier'
import { TgBalancesNotifier } from '../modules/notification/TgBalancesNotifier'
import { PriceOracleService } from '../modules/price-oracle/price-oracle.service'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { ChainClientService } from '../utils/ChainClientService'

@Module({
	imports: [DexModule.forRoot()],
	providers: [
		GraphBuilder,
		PriceOracleService,
		ChainClientService,
		TokenUtils,
		TgArbitrageNotifier,
		TgBalancesNotifier,
		GraphVisualizer,
		SimpleStargate,
		Relay,
		Stargate,
		FuseBridge,
		GraphExecutor,
		StargateAPI,
		LayerZeroScanAPI,
	],
})
export class AppModule {}
