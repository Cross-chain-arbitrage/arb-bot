import { Module } from '@nestjs/common'
import { TokenValuatorModule } from '../../../../../application/use-cases/token-valuator/token-valuator.module'
import { InterpolationHelper } from './interpolation-helper'

@Module({
	imports: [TokenValuatorModule],
	providers: [InterpolationHelper],
	exports: [InterpolationHelper],
})
export class InterpolationModule {}
