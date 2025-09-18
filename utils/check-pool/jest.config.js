/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
	testEnvironment: 'node',
	moduleNameMapper: {
		'^d3-(.+)$': '<rootDir>/node_modules/d3-$1/dist/d3-$1.min.js',
	},

	transform: {
		'^.+.tsx?$': ['ts-jest', {}],
	},
	testMatch: ['<rootDir>/check-pool.spec.ts'],

	testTimeout: 600_000,
}
