import { NestFactory } from '@nestjs/core'
import { BotAppModule } from './bot-app.module'
import { pinoLogger } from './composition/logging/pino-logger'
import { AppType, loadConfig } from './configuration/configuration'
import { DryAppModule } from './dry-app.module'
import { FinderAppModule } from './finder-app.module'

/* ============ Strategy Config ============ */

async function main() {
	const appType = loadConfig().appType

	let appModule: any
	switch (appType) {
		case AppType.BOT:
			appModule = BotAppModule
			break

		case AppType.FINDER:
			appModule = FinderAppModule
			break

		case AppType.DRY_RUN:
			appModule = DryAppModule
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
