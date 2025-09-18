import { Module } from '@nestjs/common'
import { EvmModule } from '../../evm/evm.module'
import { LayerZeroScanModule } from '../layerzero-scan/layerzero-scan.module'
import { FuseBridgeService } from './fuse-bridge.service'

@Module({
	imports: [LayerZeroScanModule, EvmModule],
	providers: [FuseBridgeService],
	exports: [FuseBridgeService],
})
export class FuseBridgeModule {}
