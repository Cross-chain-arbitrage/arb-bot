import { Module } from '@nestjs/common'
import { EvmModule } from '../../evm/evm.module'
import { LayerZeroScanModule } from '../layerzero-scan/layerzero-scan.module'
import { OftService } from './oft.service'

@Module({
	imports: [LayerZeroScanModule, EvmModule],
	providers: [OftService],
	exports: [OftService],
})
export class OftModule {}
