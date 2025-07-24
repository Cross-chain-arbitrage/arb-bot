import { Module } from '@nestjs/common'
import { FuseBridge } from '../bridges/FuseBridge/FuseBridge'
import { Relay } from '../bridges/relay/Relay'
import { SimpleStargate } from '../bridges/stargate/SimpleStargate'
import { Stargate } from '../bridges/stargate/Stargate'
import { StargateAPI } from '../bridges/stargate/StargateAPI'
import { GeckoTerminalAPI } from '../dataApi/geckoterminal/GeckoTerminalAPI'
import { LayerZeroScanAPI } from '../dataApi/layerzeroscan/LayerZeroScanAPI'
import { DexModule } from '../dex/dex.module'
import { GraphBuilder } from '../graphs/GraphBuilder'
import { GraphExecutor } from '../graphs/GraphExecutor'
import { GraphVisualizer } from '../graphs/GraphVisualizer'
import { TgArbitrageNotifier } from '../modules/notification/TgArbitrageNotifier'
import { TgBalancesNotifier } from '../modules/notification/TgBalancesNotifier'
import { PriceOracle } from '../modules/PriceOracle/PriceOracle'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { ChainClientService } from '../utils/ChainClientService'

@Module({
	imports: [DexModule.forRoot()],
	providers: [
		GraphBuilder,
		PriceOracle,
		ChainClientService,
		TokenUtils,
		GeckoTerminalAPI,
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
