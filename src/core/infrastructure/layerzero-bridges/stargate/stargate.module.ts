import { Module } from '@nestjs/common'
import { EvmModule } from '../../evm/evm.module'
import { LayerZeroScanService } from '../layerzero-scan/layerzero-scan.service'
import { SimpleStargateService } from './simple-stargate.service'
import { StargateAPIService } from './stargate-api.service'
import { StargateService } from './stargate-service'

@Module({
	imports: [EvmModule],
	providers: [
		StargateService,
		StargateAPIService,
		LayerZeroScanService,
		SimpleStargateService,
	],
	exports: [StargateService, SimpleStargateService],
})
export class StargateModule {}
