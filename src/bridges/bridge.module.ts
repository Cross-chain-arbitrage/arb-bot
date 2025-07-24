import { Module } from '@nestjs/common'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { ChainClientService } from '../utils/ChainClientService'
import { FuseBridgeService } from './layerzero-bridges/fuse-bridge/fuse-bridge.service'
import { LayerZeroScanService } from './layerzero-bridges/layerzero-scan/layerzero-scan.service'
import { SimpleStargateService } from './layerzero-bridges/stargate/simple-stargate.service'
import { StargateService } from './layerzero-bridges/stargate/stargate-service'
import { RelayService } from './relay/relay-service'

@Module({
	imports: [ChainClientService, TokenUtils],
	providers: [
		LayerZeroScanService,
		FuseBridgeService,
		StargateService,
		SimpleStargateService,
		RelayService,
	],
	exports: [
		FuseBridgeService,
		StargateService,
		SimpleStargateService,
		RelayService,
	],
})
export class BridgeModule {}
