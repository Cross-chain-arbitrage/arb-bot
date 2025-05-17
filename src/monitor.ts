import { arbitrage } from './arbitrage'
import { wait } from './utils/common'
import logger from './utils/logger'

const POLLING_INTERVAL = 10000 // 10 seconds

async function monitor() {
	while (true) {
		try {
			logger.info('Checking for arbitrage opportunities...')
			await arbitrage()
		} catch (error) {
			logger.error('Error in monitoring loop:', error)
		}

		// Wait before next check
		await wait(POLLING_INTERVAL)
	}
}

monitor().catch((error) => {
	logger.error('Fatal error in monitor:', error)
	process.exit(1)
})
