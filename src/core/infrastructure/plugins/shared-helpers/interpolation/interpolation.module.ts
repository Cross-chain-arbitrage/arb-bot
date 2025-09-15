import { Module } from '@nestjs/common'
import { InterpolationHelper } from './interpolation-helper'

@Module({
	providers: [InterpolationHelper],
	exports: [InterpolationHelper],
})
export class InterpolationModule {}
