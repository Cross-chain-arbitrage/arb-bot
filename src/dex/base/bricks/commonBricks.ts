import { isAddressEqual, PublicClient } from 'viem'

export async function callToken0Function(
	poolAddress: Address,
	client: PublicClient,
) {
	return client.readContract({
		address: poolAddress,
		abi: [
			{
				inputs: [],
				name: 'token0',
				outputs: [{ type: 'address' }],
				stateMutability: 'view',
				type: 'function',
			},
		],
		functionName: 'token0',
	})
}

export async function callToken1Function(
	poolAddress: Address,
	client: PublicClient,
) {
	return client.readContract({
		address: poolAddress,
		abi: [
			{
				inputs: [],
				name: 'token1',
				outputs: [{ type: 'address' }],
				stateMutability: 'view',
				type: 'function',
			},
		],
		functionName: 'token1',
	})
}

export async function callFactoryFunction(
	address: Address,
	client: PublicClient,
) {
	return client.readContract({
		address: address,
		abi: [
			{
				inputs: [],
				name: 'factory',
				outputs: [{ type: 'address' }],
				stateMutability: 'view',
				type: 'function',
			},
		],
		functionName: 'factory',
	})
}

export async function isContractFactoryMatch(
	contractToCheck: Address,
	poolFactory: Address,
	client: PublicClient,
) {
	const contractFactory = await callFactoryFunction(contractToCheck, client)

	return isAddressEqual(contractFactory, poolFactory)
}

export async function isRouterFactoryMatch(
	periphery: { router: Address },
	poolFactory: Address,
	client: PublicClient,
) {
	return isContractFactoryMatch(periphery.router, poolFactory, client)
}

export async function isRouterAndQuoterFactoryMatch(
	periphery: { router: Address; quoter: Address },
	poolFactory: Address,
	client: PublicClient,
) {
	const [isRouterMatch, isQuoterMatch] = await Promise.all([
		isContractFactoryMatch(periphery.router, poolFactory, client),
		isContractFactoryMatch(periphery.quoter, poolFactory, client),
	])

	return isRouterMatch && isQuoterMatch
}

export async function callFeeFunction(
	poolAddress: Address,
	client: PublicClient,
) {
	return client.readContract({
		address: poolAddress,
		abi: [
			{
				inputs: [],
				name: 'fee',
				outputs: [{ type: 'uint24' }],
				stateMutability: 'view',
				type: 'function',
			},
		],
		functionName: 'fee',
	})
}

export function isEventNameEqualSwap(
	event: { eventName: string } & object,
): boolean {
	return event.eventName === 'Swap'
}
