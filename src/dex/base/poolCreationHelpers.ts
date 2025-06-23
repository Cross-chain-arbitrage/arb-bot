import { getContract } from 'viem'
import { Token } from '../../primitives/tokens/Token'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../utils/ClientManager'
import { getPeriphery } from '../periphery'
import { POOL_CONFIGS, PoolType } from '../poolVariety'

export class PoolCreationError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, PoolCreationError.prototype)
		this.name = 'PoolCreationError'
	}
}

/**
 * Fetches pool immutables for V3-like pools (UniV3, PancakeV3, Algebra)
 */
export async function getV3PoolImmutables(
	poolAddress: Address,
	chainId: number,
	poolType: PoolType,
): Promise<PoolImmutables> {
	const config = POOL_CONFIGS[poolType] as V3PoolConfig

	if (config.type !== 'v3-like') {
		throw new PoolCreationError(
			`PoolType ${poolType} is not a V3-like pool`,
		)
	}

	const client = ClientManager.getClient(chainId)
	const contract = getContract({
		address: poolAddress,
		abi: config.abi,
		client,
	})

	const [slotData, fee, token0Address, token1Address] = await Promise.all([
		contract.read[config.slotFunction](),
		contract.read[config.feeFunction](),
		contract.read[config.tokenFunctions.token0](),
		contract.read[config.tokenFunctions.token1](),
	])

	const [token0, token1] = await Promise.all([
		TokenUtils.fromAddress<Token>(token0Address as Address, chainId),
		TokenUtils.fromAddress<Token>(token1Address as Address, chainId),
	])

	return {
		token0,
		token1,
		fee: fee as number,
		tickSpacing: (slotData as readonly unknown[])[
			config.slotTickSpacingIndex
		] as number,
	}
}

/**
 * Fetches token data for V2-like pools (UniV2, PancakeV2)
 */
export async function getV2PoolTokens(
	poolAddress: Address,
	chainId: number,
	poolType: PoolType,
): Promise<[Token, Token]> {
	const config = POOL_CONFIGS[poolType] as V2PoolConfig

	if (config.type !== 'v2-like') {
		throw new PoolCreationError(
			`PoolType ${poolType} is not a V2-like pool`,
		)
	}

	const client = ClientManager.getClient(chainId)
	const contract = getContract({
		address: poolAddress,
		abi: config.abi,
		client,
	})

	const [token0Address, token1Address] = await Promise.all([
		contract.read[config.tokenFunctions.token0](),
		contract.read[config.tokenFunctions.token1](),
	])

	const [token0, token1] = await Promise.all([
		TokenUtils.fromAddress<Token>(token0Address as Address, chainId),
		TokenUtils.fromAddress<Token>(token1Address as Address, chainId),
	])

	return [token0, token1]
}

/**
 * Validates and retrieves periphery addresses for a poolType on a given chain
 */
export function validateAndGetPeriphery(
	chainId: number,
	poolType: PoolType,
): UniV3PoolPeriphery | UniV2PoolPeriphery {
	const periphery = getPeriphery(chainId, poolType)

	if (!periphery) {
		throw new PoolCreationError(
			`No periphery configuration found for ${poolType} on chain ${chainId}`,
		)
	}

	return periphery
}

/**
 * Gets the default fee for V2-like pools
 */
export function getV2DefaultFee(poolType: PoolType): number {
	const config = POOL_CONFIGS[poolType] as V2PoolConfig

	if (config.type !== 'v2-like') {
		throw new PoolCreationError(
			`PoolType ${poolType} is not a V2-like pool`,
		)
	}

	return config.defaultFee
}
