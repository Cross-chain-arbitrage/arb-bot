import { Logger } from '@nestjs/common'
import { runFnWithRetry } from '../../src/utils/common'

describe('common', () => {
	describe('runFnWithRetry', () => {
		let logger: jest.Mocked<Pick<Logger, 'warn'>>

		beforeEach(() => {
			logger = {
				warn: jest.fn(),
			}
		})

		afterEach(() => {
			jest.clearAllMocks()
		})

		it('should return the result of the function', async () => {
			const fn = () => Promise.resolve(1)

			const result = await runFnWithRetry(
				fn,
				3,
				logger as unknown as Logger,
			)

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

			await expect(
				runFnWithRetry(fn, 3, logger as unknown as Logger),
			).rejects.toThrow('Error')
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

			await runFnWithRetry(fn, 3, logger as unknown as Logger)

			expect(logger.warn).toHaveBeenCalledTimes(2)
		})
	})
})
