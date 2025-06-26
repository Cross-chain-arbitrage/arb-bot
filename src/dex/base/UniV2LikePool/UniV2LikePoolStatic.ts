import { getContract, isAddressEqual, Transport } from 'viem'
import { UNIV2_POOL_ABI } from '../../../abi/uniV2/pool'
import { UNIV2_ROUTER_ABI } from '../../../abi/uniV2/router'
import { Token } from '../../../primitives/tokens/Token'
import { TokenUtils } from '../../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../../utils/ClientManager'
import { POOL_CONFIGS, POOL_ERRORS, PoolType } from '../../poolVariety'
import { Pool } from '../Pool'

export abstract class UniV2LikePoolStatic extends Pool {
	static getV2DefaultFee(poolType: PoolType): number {
		const config = POOL_CONFIGS[poolType] as V2PoolConfig

		if (config.type !== 'v2-like') {
			throw new POOL_ERRORS[poolType](
				`PoolType ${poolType} is not a V2-like pool`,
			)
		}

		return config.defaultFee
	}

	static async getV2PoolImmutables(
		poolAddress: Address,
		chainId: number,
		poolType: PoolType,
	): Promise<[Token, Token, Address]> {
		const config = POOL_CONFIGS[poolType] as V2PoolConfig

		if (config.type !== 'v2-like') {
			throw new POOL_ERRORS[poolType](
				`PoolType ${poolType} is not a V2-like pool`,
			)
		}

		const client = ClientManager.getClient(chainId)
		const contract = getContract<
			Transport,
			Address,
			typeof UNIV2_POOL_ABI,
			typeof client
		>({
			address: poolAddress,
			abi: config.abi,
			client,
		})

		const [token0Address, token1Address, factory] = await Promise.all([
			contract.read.token0(),
			contract.read.token1(),
			contract.read.factory(),
		])

		const [token0, token1] = await Promise.all([
			TokenUtils.fromAddress<Token>(token0Address, chainId),
			TokenUtils.fromAddress<Token>(token1Address, chainId),
		])

		return [token0, token1, factory]
	}

	static async validatePeriphery(
		chainId: number,
		poolType: PoolType,
		poolAddress: Address,
		periphery: UniV2PoolPeriphery,
		poolFactory: Address,
	) {
		const client = ClientManager.getClient(chainId)

		const routerFactoryAddress = await client.readContract({
			address: periphery.router,
			abi: UNIV2_ROUTER_ABI,
			functionName: 'factory',
		})

		if (!isAddressEqual(routerFactoryAddress, poolFactory)) {
			throw new POOL_ERRORS[poolType](
				`Invalid periphery: router factory ${routerFactoryAddress} does not match pool factory ${poolFactory}`,
			)
		}
	}

	static async getPeripheryAndImmutables(
		poolAddress: Address,
		chainId: number,
		poolType: PoolType,
	): Promise<{
		periphery: UniV2PoolPeriphery
		tokens: { token0: Token; token1: Token }
		factory: Address
	}> {
		const [token0, token1, factory] = await this.getV2PoolImmutables(
			poolAddress,
			chainId,
			poolType,
		)

		const periphery = this.getPeripherySafe(
			chainId,
			poolType,
			factory,
		) as PoolPeriphery

		await this.validatePeriphery(
			chainId,
			poolType,
			poolAddress,
			periphery,
			factory,
		)

		return { periphery, tokens: { token0, token1 }, factory }
	}
}
