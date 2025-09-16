import { NestFactory } from '@nestjs/core'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'

/* ============ Strategy Config ============ */

async function main() {
	const context = await NestFactory.createApplicationContext(AppModule)

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
}

if (require.main === module) {
	void main()
}
