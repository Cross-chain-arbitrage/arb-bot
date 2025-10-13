import { NestFactory } from '@nestjs/core'
import { ArbitrageAppModule } from './arbitrage-app.module'
import { pinoLogger } from './composition/logging/pino-logger'
import { loadConfig } from './configuration/configuration'
import { FinderAppModule } from './finder-app.module'

/* ============ Strategy Config ============ */

async function main() {
	const config = loadConfig()

	await NestFactory.createApplicationContext(
		config.isDryRun ? FinderAppModule : ArbitrageAppModule,
		{ logger: pinoLogger },
	)

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
