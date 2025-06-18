import logger from '../../src/utils/logger'

function makeSuite(name: string, test: () => void) {
	describe(name, () => beforeAndTest(test))
}

makeSuite.only = function (name: string, test: () => void) {
	describe.only(name, () => beforeAndTest(test))
}

makeSuite.skip = function (name: string, test: () => void) {
	describe.skip(name, () => beforeAndTest(test))
}

function beforeAndTest(test: () => void) {
	beforeAll(() => {
		//remove too verbose logs
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
		global.console = require('console')

		const isLogs = process.env.ENABLE_LOGS === 'true'

		if (!isLogs) {
			logger.info = () => {}
			logger.warn = () => {}
		}

		if (!isLogs) {
			jest.spyOn(console, 'log').mockImplementation(() => {})
		}
	})
	test()
}

export { makeSuite }
