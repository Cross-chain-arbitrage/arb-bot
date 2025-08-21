import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ArbitrageOrchestrator } from '../core/application/use-cases/arbitrage-orchestrator/arbitrage-orchestrator'
import { PriceOracleModule } from '../core/infrastructure/price-oracle/price-oracle.module'
import { ArbitrageScheduler } from '../core/presentation/arbitrage-scheduler/arbitrage-scheduler'
import { ArbitrageExecutorModule } from './executor/arbitrage-executor.module'
import { ArbitrageFinderModule } from './finder/arbitrage-finder.module'

@Module({
	imports: [
		ArbitrageFinderModule,
		ArbitrageExecutorModule,
		PriceOracleModule,
		ConfigModule.forRoot({ isGlobal: true }),
		ScheduleModule.forRoot(),
	],
	providers: [ArbitrageOrchestrator, ArbitrageScheduler],
})
export class AppModule {}

async function main() {
	const app = await NestFactory.createApplicationContext(AppModule)
}

void main()
