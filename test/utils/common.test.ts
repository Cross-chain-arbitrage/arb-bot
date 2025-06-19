import { runFnWithRetry } from '../../src/utils/common'
import logger from '../../src/utils/logger'
import { makeSuite } from '../testUtils/makeSuite'
makeSuite('common', () => {
	describe('runFnWithRetry', () => {
		let spyOnLoggerWarn: jest.SpyInstance

		beforeEach(() => {
			spyOnLoggerWarn = jest
				.spyOn(logger, 'warn')
				.mockImplementation(() => {})
		})

		afterEach(() => {
			jest.clearAllMocks()
		})

		it('should return the result of the function', async () => {
			const fn = () => Promise.resolve(1)

			const result = await runFnWithRetry(fn, 3)

			expect(result).toBe(1)
		})

		it('should throw an error if the function fails', async () => {
			let counter = 0

			const fn = () => {
				if (counter < 3) {
					counter++
					throw new Error('Error')
				}
				return Promise.resolve(1)
			}

			await expect(runFnWithRetry(fn, 3)).rejects.toThrow('Error')
		})

		it('should warn about the error and retry with success', async () => {
			let counter = 0

			const fn = () => {
				if (counter < 2) {
					counter++
					throw new Error('Error')
				}
				return Promise.resolve(1)
			}

			await runFnWithRetry(fn, 3)

			expect(spyOnLoggerWarn).toHaveBeenCalledTimes(2)
		})
	})
})
