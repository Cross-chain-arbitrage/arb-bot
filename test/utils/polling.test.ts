import { poll } from "../../src/utils/polling"

export function pollingTest() {
	// Mock function that returns incrementing numbers
	const createMockFn = (
		finalValue: number,
		steps: number,
	): (() => Promise<number>) => {
		let current = 0

		return async () => {
			if (current < steps) {
				current++
				return current
			}
			return Promise.resolve(finalValue)
		}
	}

	it("should return immediately if condition is met on first try", async () => {
		const fn = () => Promise.resolve(5)
		const condition = (n: number) => n === 5
		const result = await poll(fn, condition, 100, 10_000)

		expect(result).toBe(5)
	})

	it("MUST poll until condition is met", async () => {
		const fn = createMockFn(5, 3)
		const condition = (n: number) => n === 5
		const result = await poll(fn, condition, 100, 1000)

		expect(result).toBe(5)
	})

	it("MUST throw custom error on timeout", async () => {
		const expectedValue = 100
		const fn = createMockFn(expectedValue, 100)
		const condition = (n: number) => n === expectedValue
		const customError = new Error("Custom timeout error")

		await expect(poll(fn, condition, 50, 100, customError)).rejects.toThrow(
			"Custom timeout error",
		)
	})

	it("MUST respect polling interval", async () => {
		const fn = createMockFn(5, 2)
		const condition = (n: number) => n === 5
		const interval = 100

		const startTime = Date.now()

		const result = await poll(fn, condition, interval, 1000)

		const endTime = Date.now()

		expect(endTime - startTime).toBeGreaterThanOrEqual(interval * 2)

		expect(result).toBe(5)
	})

	it("MUST throw timeout period", async () => {
		const fn = () => Promise.resolve(1)
		const condition = (n: number) => n === 5

		const promise = poll(fn, condition, 100, 500)

		await expect(promise).rejects.toThrow("Polling Timeout")
	})
}
