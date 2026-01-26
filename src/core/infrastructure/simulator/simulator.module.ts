import { Module } from '@nestjs/common'
import { EvmModule } from '../evm/evm.module'
import { SimulatorService } from './simulator.service'

@Module({
	imports: [EvmModule],
	providers: [SimulatorService],
	exports: [SimulatorService],
})
export class SimulatorModule {}
