import { Module } from '@nestjs/common'
import { ChainClientModule } from '../chain-client/chain-client.module'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { SolanaClientService } from '../solana/solana-client.service'
import { SolanaTokenUtils } from '../solana/solana-tokens/solana-token-utils'
import { GasZipBridge } from './GasZip/GasZipBridge'
import { FuseBridgeService } from './layerzero-bridges/fuse-bridge/fuse-bridge.service'
import { LayerZeroScanService } from './layerzero-bridges/layerzero-scan/layerzero-scan.service'
import { SimpleStargateService } from './layerzero-bridges/stargate/simple-stargate.service'
import { StargateAPIService } from './layerzero-bridges/stargate/stargate-api.service'
import { StargateService } from './layerzero-bridges/stargate/stargate-service'
import { RelayService } from './relay/relay-service'
@Module({
	imports: [ChainClientModule],
	providers: [
		TokenUtils,
		LayerZeroScanService,
		FuseBridgeService,
		StargateService,
		StargateAPIService,
		SimpleStargateService,
		RelayService,
		GasZipBridge,
		SolanaTokenUtils,
		SolanaClientService,
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
