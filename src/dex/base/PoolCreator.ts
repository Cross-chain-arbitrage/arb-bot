import { Injectable } from '@nestjs/common'
import { PublicClient } from 'viem'
import { Token } from '../../primitives/tokens/Token'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ChainClientService } from '../../utils/ChainClientService'
import { createCustomError } from '../../utils/common'
import { Pool, PoolConstructorParams } from './Pool'

type Periphery = {
	router: Address
} & object

@Injectable()
export abstract class PoolCreator {
	readonly customError = createCustomError(`${this.constructor.name}Error`)

	constructor(
		protected readonly chainClientService: ChainClientService,
		protected readonly tokenUtils: TokenUtils,
	) {}

	/* ======== CORE FUNCTIONS, SUPPOSE TO BE NOT OVERRIDDEN ======== */

	async getPoolImmutables(
		poolAddress: Address,
		chainId: number,
	): Promise<[Token, Token, Address]> {
		const client = this.chainClientService.getClient(chainId)

		const [token0Address, token1Address, factory] = await Promise.all([
			this._getToken0Address(poolAddress, client),
			this._getToken1Address(poolAddress, client),
			this._getPoolFactoryAddress(poolAddress, client),
		])

		const [token0, token1] = await Promise.all([
			this.tokenUtils.fromAddress<Token>(token0Address, chainId),
			this.tokenUtils.fromAddress<Token>(token1Address, chainId),
		])

		return [token0, token1, factory]
	}

	async validatePeriphery(
		chainId: number,
		periphery: Periphery,
		poolFactory: Address,
	) {
		const client = this.chainClientService.getClient(chainId)

		const isPeripheryValid = await this._isPeripheryValid(
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
		periphery: Periphery
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

	getPeripherySafe(chainId: number, factory: Address): Periphery {
		const periphery = this._getPeripheryFromCollection(chainId, factory)

		if (!periphery) {
			throw new this.customError(
				`No periphery configuration found on chain ${chainId} with factory ${factory}`,
			)
		}

		return periphery
	}

	async create(poolAddress: Address, chainId: number) {
		const { periphery, immutables } =
			await this.getPeripheryAndImmutablesSafe(poolAddress, chainId)

		return this._create(poolAddress, chainId, periphery, immutables)
	}

	/* ======== FUNCTIONS TO IMPLEMENT IN DERIVED CLASSES ======== */

	/**
	 * In most cases, this checks whether the factory address of the router (and quoter, for UniV3) matches the pool's factory address.
	 * @param periphery - The router for all pools, or the quoter for UniV3.
	 * @param client - The client for the chain where the pool is deployed. You do not need to create a new client in every implementation.
	 */
	abstract _isPeripheryValid(
		periphery: Periphery,
		poolFactory: Address,
		client: PublicClient,
	): Promise<boolean>

	/**
	 * Retrieves the periphery from the collection of all pools of this type.
	 * @returns should return undefined if not found
	 */
	abstract _getPeripheryFromCollection(
		chainId: number,
		poolFactory: Address,
	): Periphery | undefined

	/**
	 * In most cases, this function returns a new instance of the derived pool class, but you may need to add additional logic here.
	 * @param periphery - The periphery obtained from getPeripheryFromCollection, after passing isPeripheryValid.
	 * @param immutables - The immutables obtained from getPoolImmutables.
	 * @returns The derived pool instance, e.g., a new UniV2Pool.
	 */
	abstract _create(
		poolAddress: Address,
		chainId: number,
		periphery: Periphery,
		immutables: PoolConstructorParams['immutables'],
	): Promise<Pool>

	abstract _getToken0Address(
		poolAddress: Address,
		client: PublicClient,
	): Promise<Address>

	abstract _getToken1Address(
		poolAddress: Address,
		client: PublicClient,
	): Promise<Address>

	abstract _getPoolFactoryAddress(
		poolAddress: Address,
		client: PublicClient,
	): Promise<Address>
}
