import { Address, getContract, isAddressEqual } from 'viem'
import { UNIV3_POOL_ABI } from '../../../abi/uniV3/uniV3Pool'
import { UNIV3_QUOTER_ABI } from '../../../abi/uniV3/uniV3Quoter'
import { UNIV3_ROUTER_ABI } from '../../../abi/uniV3/uniV3Router'
import { Token } from '../../../primitives/tokens/Token'
import { TokenUtils } from '../../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../../utils/ClientManager'
import { POOL_CONFIGS, POOL_ERRORS, PoolType } from '../../poolVariety'
import { Pool } from '../Pool'

export abstract class UniV3LikePoolStatic extends Pool {
	static async validatePeriphery(
		chainId: number,
		poolType: PoolType,
		poolAddress: Address,
		periphery: UniV3PoolPeriphery,
	) {
		const client = ClientManager.getClient(chainId)

		const poolFactoryAddress = await client.readContract({
			address: poolAddress,
			abi: UNIV3_POOL_ABI,
			functionName: 'factory',
		})

		const routerFactoryAddress = await client.readContract({
			address: periphery.router,
			abi: UNIV3_ROUTER_ABI,
			functionName: 'factory',
		})

		const quoterFactoryAddress = await client.readContract({
			address: periphery.quoter,
			abi: UNIV3_QUOTER_ABI,
			functionName: 'factory',
		})

		const customError = POOL_ERRORS[poolType]

		if (!isAddressEqual(quoterFactoryAddress, poolFactoryAddress)) {
			throw new customError(
				`Invalid periphery: quoter factory ${quoterFactoryAddress} does not match pool factory ${poolFactoryAddress}`,
			)
		}

		if (!isAddressEqual(routerFactoryAddress, poolFactoryAddress)) {
			throw new customError(
				`Invalid periphery: router factory ${routerFactoryAddress} does not match pool factory ${poolFactoryAddress}`,
			)
		}
	}

	static async getTokens(
		poolAddress: Address,
		chainId: number,
	): Promise<[Token, Token]> {
		const client = ClientManager.getClient(chainId)

		const [token0Address, token1Address] = await Promise.all([
			client.readContract({
				address: poolAddress,
				abi: UNIV3_POOL_ABI,
				functionName: 'token0',
			}),
			client.readContract({
				address: poolAddress,
				abi: UNIV3_POOL_ABI,
				functionName: 'token1',
			}),
		])

		const token0 = await TokenUtils.fromAddress<Token>(
			token0Address,
			chainId,
		)
		const token1 = await TokenUtils.fromAddress<Token>(
			token1Address,
			chainId,
		)

		return [token0, token1]
	}

	static async getV3PoolImmutables(
		poolAddress: Address,
		chainId: number,
		poolType: PoolType,
	): Promise<PoolImmutables> {
		const config = POOL_CONFIGS[poolType] as V3PoolConfig

		if (config.type !== 'v3-like') {
			throw new POOL_ERRORS[poolType](
				`PoolType ${poolType} is not a V3-like pool`,
			)
		}

		const client = ClientManager.getClient(chainId)
		const contract = getContract({
			address: poolAddress,
			abi: config.abi,
			client,
		})

		const [slotData, fee, token0Address, token1Address] = await Promise.all(
			[
				contract.read[config.slotFunction](),
				contract.read[config.feeFunction](),
				contract.read[config.tokenFunctions.token0](),
				contract.read[config.tokenFunctions.token1](),
			],
		)

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

	static async getPeripheryAndImmutables(
		poolAddress: Address,
		chainId: number,
		poolType: PoolType,
	): Promise<{ periphery: PoolPeriphery; immutables: PoolImmutables }> {
		const immutables = await this.getV3PoolImmutables(
			poolAddress,
			chainId,
			poolType,
		)

		const periphery = this.getPeripherySafe(
			chainId,
			poolType,
		) as PoolPeriphery

		await this.validatePeriphery(chainId, poolType, poolAddress, periphery)

		return { periphery, immutables }
	}
}
