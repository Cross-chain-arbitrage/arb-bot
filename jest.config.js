/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
	testEnvironment: 'node',

	transform: {
		'^.+.tsx?$': ['ts-jest', {}],
	},

	testMatch: ['<rootDir>/test/_index.test.ts'],

	testTimeout: 180_000,
}
