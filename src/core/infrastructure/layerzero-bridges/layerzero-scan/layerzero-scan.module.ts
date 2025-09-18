import { Module } from '@nestjs/common'
import { LayerZeroScanService } from './layerzero-scan.service'

@Module({
	imports: [],
	providers: [LayerZeroScanService],
	exports: [LayerZeroScanService],
})
export class LayerZeroScanModule {}
