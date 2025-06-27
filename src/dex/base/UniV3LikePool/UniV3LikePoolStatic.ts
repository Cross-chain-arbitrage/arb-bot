import { Address, getContract, isAddressEqual, Transport } from 'viem'
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
		periphery: UniV3PoolPeriphery,
		poolFactory: Address,
	) {
		const client = ClientManager.getClient(chainId)

		const [routerFactoryAddress, quoterFactoryAddress] = await Promise.all([
			client.readContract({
				address: periphery.router,
				abi: UNIV3_ROUTER_ABI,
				functionName: 'factory',
			}),
			client.readContract({
				address: periphery.quoter,
				abi: UNIV3_QUOTER_ABI,
				functionName: 'factory',
			}),
		])

		const customError = POOL_ERRORS[poolType]

		if (!isAddressEqual(quoterFactoryAddress, poolFactory)) {
			throw new customError(
				`Invalid periphery: quoter factory ${quoterFactoryAddress} does not match pool factory ${poolFactory}`,
			)
		}

		if (!isAddressEqual(routerFactoryAddress, poolFactory)) {
			throw new customError(
				`Invalid periphery: router factory ${routerFactoryAddress} does not match pool factory ${poolFactory}`,
			)
		}
	}

	static async getTokens(
		poolAddress: Address,
		chainId: number,
	): Promise<[Token, Token]> {
		const wallet = ClientManager.getWalletClient(chainId)

		const contract = getContract({
			address: poolAddress,
			abi: UNIV3_POOL_ABI,
			client: wallet,
		})

		const [token0Address, token1Address] = await Promise.all([
			contract.read.token0(),
			contract.read.token1(),
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

		const wallet = ClientManager.getWalletClient(chainId)

		const contract = getContract<
			Transport,
			Address,
			typeof UNIV3_POOL_ABI,
			typeof wallet
		>({
			address: poolAddress,
			abi: config.abi,
			client: wallet,
		})

		const [fee, token0Address, token1Address, tickSpacing, factory] =
			await Promise.all([
				contract.read[config.feeFunction as 'fee'](),
				contract.read.token0(),
				contract.read.token1(),
				contract.read[config.tickSpacingFunction as 'tickSpacing'](),
				contract.read.factory(),
			])

		const [token0, token1] = await Promise.all([
			TokenUtils.fromAddress<Token>(token0Address, chainId),
			TokenUtils.fromAddress<Token>(token1Address, chainId),
		])

		return {
			token0,
			token1,
			fee,
			tickSpacing,
			factory,
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
			immutables.factory,
		) as PoolPeriphery

		await this.validatePeriphery(
			chainId,
			poolType,
			periphery,
			immutables.factory,
		)

		return { periphery, immutables }
	}
}
