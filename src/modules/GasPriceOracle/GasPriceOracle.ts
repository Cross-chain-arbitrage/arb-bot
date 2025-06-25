import TTLCache from '@isaacs/ttlcache'
import { Chain, Eip1559FeesNotSupportedError, parseUnits } from 'viem'
import { EstimateFeesPerGasReturnType } from 'viem/_types/actions/public/estimateFeesPerGas'
import { ChainUtils } from '../../primitives/chains/ChainUtils'
import { ClientManager } from '../../utils/ClientManager'
import { createCustomError } from '../../utils/common'
import logger from '../../utils/logger'
import { LEGACY_TX_TYPE_CHAINS } from './chains'

export type GasPriceData<T extends 'eip1559' | 'legacy'> =
	EstimateFeesPerGasReturnType<T>

export const GasPriceOracleError = createCustomError('GasPriceOracleError')

export interface ChainGasConfig {
	ttl?: number
	gasMultiplier?: number
	fallbackRpcUrls?: string[]
	validationThresholds?: {
		minGasPrice: bigint
		maxGasPrice: bigint
	}
}

export interface GasPriceOracleConfig {
	defaultTtl: number
	defaultGasMultiplier: number
	chainConfigs: Map<number, ChainGasConfig>
	globalValidationThresholds: {
		minGasPrice: bigint
		maxGasPrice: bigint
	}
}

/**
 * Gas Price Oracle
 * @description Reliable service for getting gas prices with fallback strategies and validation
 * @dev Service is singleton with configurable per-chain settings
 */
export class GasPriceOracle {
	static instance: GasPriceOracle

	private readonly _oracleConfig: GasPriceOracleConfig
	private readonly _cachedGasPrices: TTLCache<
		number,
		GasPriceData<'eip1559' | 'legacy'>
	>
	private readonly _pendingRequests: Map<
		number,
		Promise<GasPriceData<'eip1559' | 'legacy'>>
	> = new Map()

	constructor(config?: Partial<GasPriceOracleConfig>) {
		this._oracleConfig = {
			defaultTtl: 60_000, // 1 minute
			defaultGasMultiplier: 1.5,
			globalValidationThresholds: {
				minGasPrice: parseUnits('0.001', 9), // 0.001 gwei
				maxGasPrice: parseUnits('2000', 9), // 1 gwei
			},
			chainConfigs: new Map(),
			...config,
		}

		this._cachedGasPrices = new TTLCache({
			ttl: this._oracleConfig.defaultTtl,
		})
	}

	static getInstance(config?: Partial<GasPriceOracleConfig>): GasPriceOracle {
		if (!GasPriceOracle.instance) {
			GasPriceOracle.instance = new GasPriceOracle(config)
		}
		return GasPriceOracle.instance
	}

	async getGasPrice<T extends 'eip1559' | 'legacy'>(
		chainId: number,
	): Promise<GasPriceData<T>> {
		// Check cache first
		const cachedGasPrice =
			this._cachedGasPrices.get<GasPriceData<T>>(chainId)

		if (cachedGasPrice) {
			return cachedGasPrice
		}

		// Check if there's already a pending request for this chain
		const pendingRequest = this._pendingRequests.get(chainId)
		if (pendingRequest) return pendingRequest as Promise<GasPriceData<T>>

		const promise = this._fetchGasPriceFromRPC(chainId)

		this._pendingRequests.set(chainId, promise)

		try {
			const result = await promise
			this._cachedGasPrices.set(chainId, result)
			this._pendingRequests.delete(chainId)

			this._validateGasPrice(chainId, result)

			return result as GasPriceData<T>
		} catch (error) {
			this._pendingRequests.delete(chainId)
			throw error
		}
	}

	private async _fetchGasPriceFromRPC(
		chainId: number,
	): Promise<GasPriceData<'eip1559' | 'legacy'>> {
		const client = ClientManager.getClient(chainId)
		const chainConfig = this._getChainConfig(chainId)
		const gasMultiplier =
			chainConfig.gasMultiplier ?? this._oracleConfig.defaultGasMultiplier

		try {
			const txType = this.isChainEIP1559Compatible(chainId)
				? 'eip1559'
				: 'legacy'

			const fees = await client.estimateFeesPerGas<
				Chain,
				'eip1559' | 'legacy'
			>({
				type: txType,
				chain: {
					...client.chain,
					fees: {
						baseFeeMultiplier: () => gasMultiplier,
					},
				},
			})

			return fees
		} catch (error) {
			if (error instanceof Eip1559FeesNotSupportedError) {
				logger.debug(
					`${ChainUtils.getChainNameById(chainId)} doesn't support EIP-1559, falling back to legacy`,
				)

				const fees = await client.estimateFeesPerGas<Chain, 'legacy'>({
					type: 'legacy',
					chain: {
						...client.chain,
						fees: {
							baseFeeMultiplier: () => gasMultiplier,
						},
					},
				})

				return fees
			}

			throw error
		}
	}

	private _validateGasPrice(
		chainId: number,
		gasPrice: GasPriceData<'eip1559' | 'legacy'>,
	): void {
		const chainConfig = this._getChainConfig(chainId)
		const thresholds =
			chainConfig.validationThresholds ??
			this._oracleConfig.globalValidationThresholds

		// Validate legacy gas price
		if (
			gasPrice.gasPrice !== undefined &&
			thresholds.minGasPrice &&
			thresholds.maxGasPrice
		) {
			if (gasPrice.gasPrice < thresholds.minGasPrice) {
				throw new GasPriceOracleError(
					`Gas price too low: ${gasPrice.gasPrice} < ${thresholds.minGasPrice}`,
				)
			}
			if (gasPrice.gasPrice > thresholds.maxGasPrice) {
				throw new GasPriceOracleError(
					`Gas price too high: ${gasPrice.gasPrice} > ${thresholds.maxGasPrice}`,
				)
			}
		}

		// Validate EIP-1559 fees
		if (
			gasPrice.maxFeePerGas !== undefined &&
			thresholds.minGasPrice &&
			thresholds.maxGasPrice
		) {
			if (gasPrice.maxFeePerGas < thresholds.minGasPrice) {
				throw new GasPriceOracleError(
					`Max fee per gas too low: ${gasPrice.maxFeePerGas} < ${thresholds.minGasPrice}`,
				)
			}
			if (gasPrice.maxFeePerGas > thresholds.maxGasPrice) {
				throw new GasPriceOracleError(
					`Max fee per gas too high: ${gasPrice.maxFeePerGas} > ${thresholds.maxGasPrice}`,
				)
			}
		}
	}

	private _getChainConfig(chainId: number): ChainGasConfig {
		return this._oracleConfig.chainConfigs.get(chainId) ?? {}
	}

	isChainEIP1559Compatible(chainId: number): boolean {
		return !LEGACY_TX_TYPE_CHAINS.includes(chainId)
	}

	getGasMultiplier(chainId: number): number {
		const chainConfig = this._getChainConfig(chainId)
		return (
			chainConfig.gasMultiplier ?? this._oracleConfig.defaultGasMultiplier
		)
	}

	setGasMultiplier(chainId: number, gasMultiplier: number): void {
		const chainConfig = this._getChainConfig(chainId)
		this._oracleConfig.chainConfigs.set(chainId, {
			...chainConfig,
			gasMultiplier,
		})
		this._cachedGasPrices.delete(chainId)
	}

	setChainConfig(chainId: number, chainConfig: ChainGasConfig): void {
		this._oracleConfig.chainConfigs.set(chainId, chainConfig)
		this._cachedGasPrices.delete(chainId)
	}

	clearCache(chainId?: number): void {
		if (chainId !== undefined) {
			this._cachedGasPrices.delete(chainId)
			this._pendingRequests.delete(chainId)
		} else {
			this._cachedGasPrices.clear()
			this._pendingRequests.clear()
		}
	}
}
