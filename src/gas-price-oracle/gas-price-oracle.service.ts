import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { ChainClientService } from '../chain-client/chain-client.service'

@Injectable()
export class GasPriceOracleService {
	constructor(
		private readonly chainClientService: ChainClientService,
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
	) {}

	async getGasPrice(chainId: number): Promise<bigint> {
		const cachedGasPrice = await this.cacheManager.get<bigint>(
			this.cacheKey(chainId),
		)

		if (cachedGasPrice) return cachedGasPrice

		const gasPrice = await this.getChainGasPrice(chainId)

		await this.cacheManager.set(
			this.cacheKey(chainId),
			gasPrice,
			1000 * 60 * 5,
		)

		return gasPrice
	}

	private async getChainGasPrice(chainId: number): Promise<bigint> {
		const chainClient = this.chainClientService.getClient(chainId)

		const gasPrice = await chainClient.getGasPrice()

		return gasPrice
	}

	private cacheKey(chainId: number): string {
		return `gas-price-${chainId}`
	}
}
