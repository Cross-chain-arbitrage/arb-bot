import { NestFactory } from '@nestjs/core'
import { ArbitrageAppModule } from './arbitrage-app.module'
import { pinoLogger } from './composition/logging/pino-logger'
import { OpportunityAppModule } from './opportunity-app.module'

/* ============ Strategy Config ============ */

async function main() {
	const appType = process.env.APP_TYPE as string

	let appModule: any
	switch (appType) {
		case 'arbitrage':
			appModule = ArbitrageAppModule
			break

		case 'opportunity':
			appModule = OpportunityAppModule
			break

		default:
			throw Error(`app type ${appType} not supported`)
	}

	await NestFactory.createApplicationContext(appModule, {
		logger: pinoLogger,
	})

	process.on('uncaughtException', (error) => {
		pinoLogger.fatal('Uncaught exception', error)
		process.exit(0)
	})

	process.on('unhandledRejection', (error) => {
		pinoLogger.fatal('Unhandled rejection', error)
		process.exit(0)
	})
}

if (require.main === module) {
	void main()
}
