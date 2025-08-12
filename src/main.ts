import { NestFactory } from '@nestjs/core'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { getEnvSafe } from './utils/common'

/* ============ Strategy Config ============ */

async function main() {
	const isProd = getEnvSafe('NODE_ENV') === 'production'
	const context = await NestFactory.createApplicationContext(AppModule, {
		bufferLogs: true,
	})

	context.useLogger(context.get(Logger))

	const logger = context.get(Logger)

	process.on('uncaughtException', (error) => {
		logger.fatal('Uncaught exception', error)
		process.exit(0)
	})

	process.on('unhandledRejection', (error) => {
		logger.fatal('Unhandled rejection', error)
		process.exit(0)
	})

	// Global runtime is continued at `src/strategies/Strategy:onApplicationBootstrap()`
}

if (require.main === module) {
	void main()
}
