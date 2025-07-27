import { Module } from '@nestjs/common'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { ChainClientService } from '../utils/ChainClientService'
import { GasZipBridge } from './GasZip/GasZipBridge'
import { FuseBridgeService } from './layerzero-bridges/fuse-bridge/fuse-bridge.service'
import { LayerZeroScanService } from './layerzero-bridges/layerzero-scan/layerzero-scan.service'
import { SimpleStargateService } from './layerzero-bridges/stargate/simple-stargate.service'
import { StargateAPIService } from './layerzero-bridges/stargate/stargate-api.service'
import { StargateService } from './layerzero-bridges/stargate/stargate-service'
import { RelayService } from './relay/relay-service'

@Module({
	providers: [
		ChainClientService,
		TokenUtils,
		LayerZeroScanService,
		FuseBridgeService,
		StargateService,
		StargateAPIService,
		SimpleStargateService,
		RelayService,
		GasZipBridge,
	],
	exports: [
		FuseBridgeService,
		StargateService,
		SimpleStargateService,
		StargateAPIService,
		RelayService,
		GasZipBridge,
	],
})
export class BridgeModule {}
