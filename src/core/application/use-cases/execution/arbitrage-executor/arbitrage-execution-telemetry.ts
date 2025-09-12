import { Logger } from '@nestjs/common'

export class ArbitrageExecutionTelemetry {
	logger = new Logger(ArbitrageExecutionTelemetry.name)

	onArbitrageEnd(result: unknown) {
		const log = {
			phase: 'arbitrage_end',
			result,
		}
		this.logger.log(log, `Arbitrage execution ended`)
	}
}
