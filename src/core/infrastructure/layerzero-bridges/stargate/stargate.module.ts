import { Module } from '@nestjs/common'
import { EvmModule } from '../../evm/evm.module'
import { SolanaModule } from '../../solana/solana.module'
import { LayerZeroScanModule } from '../layerzero-scan/layerzero-scan.module'
import { SimpleStargateService } from './simple-stargate.service'
import { StargateAPIService } from './stargate-api.service'
import { StargateService } from './stargate-service'

@Module({
	imports: [EvmModule, SolanaModule, LayerZeroScanModule],
	providers: [StargateService, StargateAPIService, SimpleStargateService],
	exports: [StargateService, SimpleStargateService, StargateAPIService],
})
export class StargateModule {}
