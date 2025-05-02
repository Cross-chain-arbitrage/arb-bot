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
	beforeAll(async () => {
		//remove too verbose logs
		global.console = require('console')

		const isLogs = process.env.ENABLE_LOGS === 'true'

		if (!isLogs) {
			jest.spyOn(console, 'log').mockImplementation(() => {})
		}
	})
	test()
}

export { makeSuite }
