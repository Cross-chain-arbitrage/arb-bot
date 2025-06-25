import TTLCache from '@isaacs/ttlcache'
import { Chain, Eip1559FeesNotSupportedError, parseUnits } from 'viem'
import { estimateFeesPerGas } from 'viem/_types/actions/public/estimateFeesPerGas'
import { ChainUtils } from '../../primitives/chains/ChainUtils'
import { ClientManager } from '../../utils/ClientManager'
import { createCustomError } from '../../utils/common'
import logger from '../../utils/logger'
import { LEGACY_TX_TYPE_CHAINS } from './chains'

export type GasPriceData = Awaited<ReturnType<typeof estimateFeesPerGas>>

export const GasPriceOracleError = createCustomError('GasPriceOracleError')

export interface ChainGasConfig {
	ttl?: number
	gasMultiplier?: number
	fallbackRpcUrls?: string[]
	validationThresholds?: {
		minGasPrice?: bigint
		maxGasPrice?: bigint
	}
}

export interface GasPriceOracleConfig {
	defaultTtl: number
	defaultGasMultiplier: number
	globalValidationThresholds: {
		minGasPrice: bigint
		maxGasPrice: bigint
	}
	chainConfigs: Map<number, ChainGasConfig>
}

interface PendingRequest {
	promise: Promise<GasPriceData>
	timestamp: number
}

/**
 * Gas Price Oracle
 * @description Reliable service for getting gas prices with fallback strategies and validation
 * @dev Service is singleton with configurable per-chain settings
 */
export class GasPriceOracle {
	static instance: GasPriceOracle

	private readonly _config: GasPriceOracleConfig
	private readonly _cachedGasPrices: TTLCache<number, GasPriceData>
	private readonly _pendingRequests: Map<number, PendingRequest> = new Map()

	constructor(config?: Partial<GasPriceOracleConfig>) {
		this._config = {
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
			ttl: this._config.defaultTtl,
		})
	}

	static getInstance(config?: Partial<GasPriceOracleConfig>): GasPriceOracle {
		if (!GasPriceOracle.instance) {
			GasPriceOracle.instance = new GasPriceOracle(config)
		}
		return GasPriceOracle.instance
	}

	async getGasPrice(chainId: number): Promise<GasPriceData> {
		// Check cache first
		const cachedGasPrice = this._cachedGasPrices.get(chainId)
		if (cachedGasPrice) {
			return cachedGasPrice
		}

		// Check if there's already a pending request for this chain
		const pendingRequest = this._pendingRequests.get(chainId)
		if (pendingRequest) {
			// If the pending request is too old, create a new one
			if (Date.now() - pendingRequest.timestamp < 5000) {
				return pendingRequest.promise
			} else {
				this._pendingRequests.delete(chainId)
			}
		}

		const promise = this._fetchGasPriceWithFallback(chainId)
		this._pendingRequests.set(chainId, {
			promise,
			timestamp: Date.now(),
		})

		try {
			const result = await promise
			this._pendingRequests.delete(chainId)
			return result
		} catch (error) {
			this._pendingRequests.delete(chainId)
			throw error
		}
	}

	private async _fetchGasPriceWithFallback(
		chainId: number,
	): Promise<GasPriceData> {
		const config = this._getChainConfig(chainId)
		const cachedGasPrice = this._cachedGasPrices.get(chainId)

		if (cachedGasPrice) {
			return cachedGasPrice
		}

		const gasPrice = await this._fetchGasPriceFromRPC(chainId)

		// Validate the gas price
		this._validateGasPrice(chainId, gasPrice)

		// Cache successful result
		const ttl = config.ttl ?? this._config.defaultTtl
		this._cachedGasPrices.set(chainId, gasPrice, { ttl })

		return gasPrice
	}

	private async _fetchGasPriceFromRPC(
		chainId: number,
	): Promise<GasPriceData> {
		const client = ClientManager.getClient(chainId)
		const chain = client.chain as Chain
		const config = this._getChainConfig(chainId)
		const gasMultiplier =
			config.gasMultiplier ?? this._config.defaultGasMultiplier

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
					...chain,
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
						...chain,
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

	private _validateGasPrice(chainId: number, gasPrice: GasPriceData): void {
		const config = this._getChainConfig(chainId)
		const thresholds =
			config.validationThresholds ??
			this._config.globalValidationThresholds

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
		return this._config.chainConfigs.get(chainId) ?? {}
	}

	private async _delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	isChainEIP1559Compatible(chainId: number): boolean {
		return !LEGACY_TX_TYPE_CHAINS.includes(chainId)
	}

	getGasMultiplier(chainId: number): number {
		const config = this._getChainConfig(chainId)
		return config.gasMultiplier ?? this._config.defaultGasMultiplier
	}

	setGasMultiplier(chainId: number, gasMultiplier: number): void {
		const config = this._getChainConfig(chainId)
		this._config.chainConfigs.set(chainId, { ...config, gasMultiplier })
		this._cachedGasPrices.delete(chainId)
	}

	setChainConfig(chainId: number, config: ChainGasConfig): void {
		this._config.chainConfigs.set(chainId, config)
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

/**
 * 1.
 */
