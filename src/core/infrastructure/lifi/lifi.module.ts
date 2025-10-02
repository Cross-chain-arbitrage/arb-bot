import { Module } from '@nestjs/common'
import { EvmModule } from '../evm/evm.module'
import { LifiService } from './lifi.service'

@Module({
	imports: [EvmModule],
	providers: [LifiService],
	exports: [LifiService],
})
export class LifiModule {}
