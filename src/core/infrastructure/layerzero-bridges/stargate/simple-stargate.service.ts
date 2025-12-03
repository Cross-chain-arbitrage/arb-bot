import { Message } from '@layerzerolabs/scan-client'
import { Injectable } from '@nestjs/common'
import axios from 'axios'
import { convertDecimals, createCustomError } from '../../../../utils/common'
import { TokenAmount } from '../../../domain/value-objects/token-amount'
import { ChainClientService } from '../../evm/chain-client/chain-client.service'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'
import { SolanaClientService } from '../../solana/solana-client.service'
import { SolanaNative } from '../../solana/solana-tokens/solana-native'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'
import { LayerZeroScanService } from '../layerzero-scan/layerzero-scan.service'
import { STARGATE_CHAINS } from './dumped/chains'
import {
	QuoteEvmSrc,
	QuoteEvmSrcSchema,
} from './schemas/stargate-quite-evm-src.schema'
import {
	QuoteSolanaSrc,
	QuoteSolanaSrcSchema,
} from './schemas/stargate-quite-solana-src.schema'

const AVERAGE_BRIDGE_GAS_COST = 400_000n

@Injectable()
export class SimpleStargateService {
	constructor(
		private readonly chainClientService: ChainClientService,
		private readonly layerZeroScanService: LayerZeroScanService,
		private readonly solanaClientService: SolanaClientService,
		private readonly evmTokenUtils: TokenUtils,
		private readonly solanaTokenUtils: SolanaTokenUtils,
	) {}

	baseUrl = 'https://stargate.finance/api/v1'
	customError = createCustomError('SimpleStargateError')

	async quote(
		tokenIn: Token | NativeCurrency | SolanaToken,
		tokenOut: Token | NativeCurrency | SolanaToken,
		amountIn: bigint,
	): Promise<{
		amountOut: bigint
		feeInNative: bigint
		gas: bigint
	}> {
		// Stargate simulates bridges from Solana and returns error if you have insufficient balance
		if (tokenIn instanceof SolanaToken) {
			return {
				amountOut: tokenOut.parseUnits(tokenIn.formatUnits(amountIn)),
				feeInNative: 0n,
				gas: AVERAGE_BRIDGE_GAS_COST,
			}
		}

		const quoteResult = await this.requestQuote(tokenIn, tokenOut, amountIn)

		const quote = quoteResult.quotes[0]

		return {
			amountOut: BigInt(quote.dstAmount),
			feeInNative: BigInt(quote.fees[0].amount),
			gas: AVERAGE_BRIDGE_GAS_COST,
		}
	}

	async requestQuote<T extends QuoteSolanaSrc | QuoteEvmSrc>(
		tokenIn: Token | NativeCurrency | SolanaToken,
		tokenOut: Token | NativeCurrency | SolanaToken,
		amountIn: bigint,
	): Promise<T> {
		const { chainKey: srcChainKey, walletAddress: srcAddress } =
			this.resolveNetworkParams(tokenIn)
		const { chainKey: dstChainKey, walletAddress: dstAddress } =
			this.resolveNetworkParams(tokenOut)

		const SHARED_DECIMALS = 6

		const srcAmount =
			tokenIn.decimals > SHARED_DECIMALS
				? (amountIn /
						10n ** BigInt(tokenIn.decimals - SHARED_DECIMALS)) *
					10n ** BigInt(tokenIn.decimals - SHARED_DECIMALS)
				: amountIn

		const response = await axios.get('/quotes', {
			baseURL: this.baseUrl,
			params: {
				srcToken: tokenIn.address,
				dstToken: tokenOut.address,
				srcAddress,
				dstAddress,
				srcChainKey,
				dstChainKey,
				srcAmount,
				dstAmountMin: convertDecimals(srcAmount, tokenIn, tokenOut),
				// dstAmountMin: 0,
			},
		})

		if (tokenIn instanceof SolanaToken) {
			return QuoteSolanaSrcSchema.parse(response.data) as T
		} else {
			return QuoteEvmSrcSchema.parse(response.data) as T
		}
	}

	resolveNetworkParams(token: Token | NativeCurrency | SolanaToken) {
		if (token instanceof SolanaToken) {
			return {
				chainKey: 'solana',
				walletAddress: this.solanaClientService.walletAddress,
			}
		} else {
			return {
				chainKey: this.chainIdToChainKey(token.chainId),
				walletAddress: this.chainClientService.getWalletClient(
					token.chainId,
				).account.address,
			}
		}
	}

	async bridge(
		tokenIn: Token | NativeCurrency | SolanaToken,
		tokenOut: Token | NativeCurrency | SolanaToken,
		amountIn: bigint,
	): Promise<{
		amountOut: bigint
		lzFee: TokenAmount
		txHash: string
		waitForBridge: () => Promise<Message>
	}> {
		const quoteResult = await this.requestQuote(tokenIn, tokenOut, amountIn)

		let txHash: string
		let token: NativeCurrency | SolanaNative

		if (tokenIn instanceof SolanaToken) {
			const quote = (quoteResult as QuoteSolanaSrc).quotes[0]

			token = this.solanaTokenUtils.getNative()

			txHash = await this.solanaClientService.sendTx(
				quote.steps[0].transaction.data,
			)
		} else {
			const walletClient = this.chainClientService.getWalletClient(
				tokenIn.chainId,
			)

			const quote = (quoteResult as QuoteEvmSrc).quotes[0]

			const bridgeStep = quote.steps.find(
				(step) => step.type === 'bridge',
			)

			if (!bridgeStep) throw Error('bridge step not found')

			txHash = await walletClient.sendTransaction({
				to: bridgeStep.transaction.to as `0x${string}`,
				data: bridgeStep.transaction.data as `0x${string}`,
				value: BigInt(bridgeStep.transaction.value),
			})

			token = this.evmTokenUtils.getNative(tokenIn.chainId)

			const receipt = await this.chainClientService
				.getClient(tokenIn.chainId)
				.waitForTransactionReceipt({
					hash: txHash as `0x${string}`,
				})

			if (receipt.status !== 'success') {
				throw new this.customError(`Transaction ${txHash} reverted`)
			}
		}

		return {
			amountOut: BigInt(quoteResult.quotes[0].dstAmount),
			lzFee: {
				token,
				amount: BigInt(quoteResult.quotes[0].fees[0].amount),
			},
			waitForBridge: () =>
				this.layerZeroScanService.waitForDeliveryStatus(txHash),
			txHash,
		}
	}

	chainIdToChainKey(chainId: number) {
		const chain = STARGATE_CHAINS.find((chain) => chain.chainId === chainId)

		if (!chain) {
			throw new Error(`Chain ${chainId} not found`)
		}

		return chain.chainKey
	}
}

// @Module({
// 	imports: [ChainClientModule.forRoot()],
// 	providers: [
// 		TokenUtils,
// 		LayerZeroScanService,
// 		SolanaClientService,
// 		SolanaTokenUtils,
// 		SimpleStargateService,
// 	],
// })
// class AppModule {}

// async function main() {
// 	const app = await NestFactory.create(AppModule)
// 	await app.init()

// 	const simpleStargateService = app.get(SimpleStargateService)
// 	const solanaTokenUtils = app.get(SolanaTokenUtils)
// 	const tokenUtils = app.get(TokenUtils)
// 	const layerZeroScanService = app.get(LayerZeroScanService)

// 	const anonAddressOnSolana = '9McvH6w97oewLmPxqQEoHUAv3u5iYMyQ9AeZZhguYf1T'
// 	const anonAddressOnArbitrum = '0x79bbF4508B1391af3A0F4B30bb5FC4aa9ab0E07C'

// 	const anonOnSolana =
// 		await solanaTokenUtils.fromAddress<SolanaToken>(anonAddressOnSolana)

// 	const anonOnArbitrum = await tokenUtils.fromAddress(
// 		anonAddressOnArbitrum,
// 		arbitrum.id,
// 	)

// 	const bridgeRes = await simpleStargateService.bridge(
// 		anonOnArbitrum,
// 		anonOnSolana,
// 		anonOnArbitrum.parseUnits('0.4'),
// 	)

// 	console.log(bridgeRes)

// 	const tx = await bridgeRes.waitForTx()

// 	console.log(tx)
// }

// void main()
