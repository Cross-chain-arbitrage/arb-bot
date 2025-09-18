export const ERC20_ABI = [
	{
		inputs: [],
		name: 'decimals',
		outputs: [{ type: 'uint8' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'symbol',
		outputs: [{ type: 'string' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'name',
		outputs: [{ type: 'string' }],
		stateMutability: 'view',
		type: 'function',
	},
] as const
