import { PublicClient } from 'viem'
import { Token } from '../../primitives/tokens/Token'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../utils/ClientManager'
import { createCustomError } from '../../utils/common'
import { Pool, PoolConstructorParams } from './Pool'

export abstract class PoolCreator {
	readonly customError: ReturnType<typeof createCustomError>

	constructor() {
		this.customError = createCustomError(`${this.constructor.name}Error`)
	}

	/* ======== CORE FUNCTIONS, SUPPOSE TO BE NOT OVERRIDDEN ======== */

	async getPoolImmutables(
		poolAddress: Address,
		chainId: number,
	): Promise<[Token, Token, Address]> {
		const client = ClientManager.getClient(chainId)

		const [token0Address, token1Address, factory] = await Promise.all([
			this.getToken0Address(poolAddress, client),
			this.getToken1Address(poolAddress, client),
			this.getFactoryAddress(poolAddress, client),
		])

		const [token0, token1] = await Promise.all([
			TokenUtils.fromAddress<Token>(token0Address, chainId),
			TokenUtils.fromAddress<Token>(token1Address, chainId),
		])

		return [token0, token1, factory]
	}

	async validatePeriphery(
		chainId: number,
		periphery: {
			router: Address
		},
		poolFactory: Address,
	) {
		const client = ClientManager.getClient(chainId)

		const isPeripheryValid = await this.isPeripheryValid(
			periphery,
			poolFactory,
			client,
		)

		if (!isPeripheryValid) {
			throw new this.customError(
				`Invalid periphery for pool factory ${poolFactory}`,
			)
		}
	}

	async getPeripheryAndImmutablesSafe(
		poolAddress: Address,
		chainId: number,
	): Promise<{
		periphery: {
			router: Address
		}
		immutables: PoolConstructorParams['immutables']
	}> {
		const [token0, token1, factory] = await this.getPoolImmutables(
			poolAddress,
			chainId,
		)

		const periphery = this.getPeripherySafe(chainId, factory)
		await this.validatePeriphery(chainId, periphery, factory)

		return {
			periphery,
			immutables: { token0, token1, factory },
		}
	}

	getPeripherySafe(
		chainId: number,
		factory: Address,
	): {
		router: Address
	} & object {
		const periphery = this.getPeripheryFromCollection(chainId, factory)

		if (!periphery) {
			throw new this.customError(
				`No periphery configuration found on chain ${chainId} with factory ${factory}`,
			)
		}

		return periphery
	}

	/* ======== FUNCTIONS TO IMPLEMENT IN DERIVED CLASSES ======== */

	abstract isPeripheryValid(
		periphery: {
			router: Address
		},
		poolFactory: Address,
		client: PublicClient,
	): Promise<boolean>

	abstract getPeripheryFromCollection(
		chainId: number,
		factory: Address,
	):
		| ({
				router: Address
		  } & object)
		| undefined

	abstract create(
		poolAddress: Address,
		chainId: number,
	): Promise<Pool & object>

	abstract getToken0Address(
		poolAddress: Address,
		client: PublicClient,
	): Promise<Address>

	abstract getToken1Address(
		poolAddress: Address,
		client: PublicClient,
	): Promise<Address>

	abstract getFactoryAddress(
		poolAddress: Address,
		client: PublicClient,
	): Promise<Address>
}
