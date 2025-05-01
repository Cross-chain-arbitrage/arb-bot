import { makeSuite } from './utils/makeSuite'

makeSuite('test', () => {
	it('should test', () => {
		console.log('log log log')
		expect(true).toBe(true)
	})
})
