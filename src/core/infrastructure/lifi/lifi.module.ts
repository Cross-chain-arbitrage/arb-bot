import { Module } from '@nestjs/common'
import { EvmModule } from '../evm/evm.module'
import { SimulatorModule } from '../simulator/simulator.module'
import { LifiService } from './lifi.service'

@Module({
	imports: [EvmModule, SimulatorModule],
	providers: [LifiService],
	exports: [LifiService],
})
export class LifiModule {}
