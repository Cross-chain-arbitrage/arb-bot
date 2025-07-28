import { ConsoleLogger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { getEnvSafe } from './utils/common'

/* ============ Strategy Config ============ */

async function main() {
	const isProd = getEnvSafe('NODE_ENV') === 'production'

	await NestFactory.createApplicationContext(AppModule, {
		logger: new ConsoleLogger({
			colors: !isProd,
			json: isProd,
		}),
	})

	// Global runtime is continued at `src/strategies/Strategy:onApplicationBootstrap()`
}

if (require.main === module) {
	void main()
}
