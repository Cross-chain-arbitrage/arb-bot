import { Injectable } from '@nestjs/common'
import { getContract } from 'viem'
import { createCustomError } from '../../../../utils/common'
import { TokenId } from '../../../domain/value-objects/token-id'
import { OFT_ABI } from '../../evm/abi/stargate/oft'
import { STARGATE_BASE_ABI } from '../../evm/abi/stargate/stargateBase'
import { ChainClientService } from '../../evm/chain-client/chain-client.service'
import { padAddressToBytes32 } from '../../evm/helpers'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { TokenAmount } from '../../evm/primitives/tokens/TokenAmount'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'
import { WrappedNative } from '../../evm/primitives/tokens/WrappedNative'
import { LZBridgeTx } from '../layerzero-bridge-tx'
import { LayerZeroScanService } from '../layerzero-scan/layerzero-scan.service'
import { getChainEIdByNativeChainId } from '../layerzero.utils'
import { tokenIdToContract } from './token-id-to-contract'

const EXTRA_OPTIONS = '0x00030100110100000000000000000000000000030d40' as Hex //gas on dst, the value is from lz documentation
export const OftError = createCustomError('OftError')
const BRIDGE_GAS_COST = 400_000n

@Injectable()
export class OftService {
	cachedOft = new Map<TokenId, boolean>()

	constructor(
		private readonly chainClientService: ChainClientService,
		private readonly tokenUtils: TokenUtils,
		private readonly layerZeroScanService: LayerZeroScanService,
	) {}

	async bridge(
		tokenIn: Token | NativeCurrency | WrappedNative,
		tokenOut: Token | NativeCurrency | WrappedNative,
		amount: bigint,
	): Promise<{
		bridgeTx: LZBridgeTx
		amountOut: bigint
		lzFee: TokenAmount
	}> {
		const toChainId = tokenOut.chainId

		const { address: oftAddress } = await this.getOftAddress(tokenIn)

		const wallet = this.chainClientService.getWalletClient(tokenIn.chainId)
		const recipient = wallet.account.address
		const balance = await tokenIn.balanceOf(wallet.account.address)

		if (balance < amount) {
			throw new OftError(
				`Insufficient balance, needed ${amount}, has ${balance}`,
			)
		}

		const { quote, amountOut } = await this.quoteBridge(
			tokenIn,
			tokenOut,
			amount,
		)

		const toChainEId = getChainEIdByNativeChainId(toChainId)
		const recipientBytes32 = padAddressToBytes32(recipient)
		const minAmountLD = this.subtractDustAndConvertDecimals(
			tokenIn.decimals,
			tokenOut.decimals,
			amount,
		)

		const sendParams = {
			dstEid: toChainEId,
			to: recipientBytes32,
			amountLD: amount,
			minAmountLD,
			extraOptions: EXTRA_OPTIONS,
			composeMsg: '0x' as Hex,
			oftCmd: '0x' as Hex,
		}

		const client = this.chainClientService.getClient(tokenIn.chainId)

		const isNative = tokenIn instanceof NativeCurrency

		const value =
			quote.messagingFee.nativeFee +
			(isNative ? this.subtractDust(tokenIn.decimals, amount) : 0n)

		const { request } = await client.simulateContract({
			account: wallet.account,
			address: oftAddress,
			abi: STARGATE_BASE_ABI,
			functionName: 'send',
			value,
			args: [
				sendParams,
				quote.messagingFee as { nativeFee: bigint; lzTokenFee: bigint },
				wallet.account.address,
			],
		})

		const txHash = await wallet.writeContract(request)

		return {
			bridgeTx: new LZBridgeTx(
				this.layerZeroScanService,
				txHash,
				tokenIn,
				tokenOut,
				amount,
			),
			amountOut,
			lzFee: new TokenAmount(
				this.chainClientService,
				this.tokenUtils.getNative(tokenIn.chainId),
				quote.messagingFee.nativeFee,
			),
		}
	}

	private async quote(
		tokenIn: Token | NativeCurrency,
		tokenOut: Token | NativeCurrency,
		amount: bigint,
	): Promise<{ messagingFee: MessagingFee }> {
		const wallet = this.chainClientService.getWalletClient(tokenIn.chainId)

		return this._quote(tokenIn, tokenOut, amount, wallet.account.address)
	}

	//TODO: don't approve if token is oft and don't need approve
	async approveInfinite(tokenIn: Token | NativeCurrency) {
		if (tokenIn instanceof NativeCurrency) return

		const { address: oftAddress, isAdapter } =
			await this.getOftAddress(tokenIn)

		const tx = await tokenIn.approveInfinite(oftAddress)

		return tx
	}

	private async _quote(
		tokenIn: Token | NativeCurrency,
		tokenOut: Token | NativeCurrency,
		amount: bigint,
		recipient: Address,
	): Promise<{ messagingFee: MessagingFee }> {
		const messagingFee = await this.quoteSend(
			tokenIn,
			tokenOut,
			amount,
			recipient,
		)

		const FEE_MULTIPLIER = 11000n
		const BASIS_POINTS = 10000n

		const messagingFeeWithExtra: MessagingFee = {
			lzTokenFee:
				(messagingFee.lzTokenFee * FEE_MULTIPLIER) / BASIS_POINTS,
			nativeFee: (messagingFee.nativeFee * FEE_MULTIPLIER) / BASIS_POINTS,
		}

		if (tokenIn instanceof NativeCurrency)
			return { messagingFee: messagingFeeWithExtra }

		const [oftLimit, oftFeeDetails, oftReceipt] = await this.quoteOFT(
			tokenIn,
			tokenOut,
			amount,
			recipient,
		)

		this.validateBridgingAmount(oftLimit, amount)

		const result: QuoteResult = {
			messagingFee: messagingFeeWithExtra,
			oftLimit,
			oftFeeDetails,
			oftReceipt,
		}

		return result
	}

	private async quoteSend(
		tokenIn: Token | NativeCurrency,
		tokenOut: Token | NativeCurrency,
		amount: bigint,
		recipient: Address,
	): Promise<MessagingFee> {
		const toChainEId = getChainEIdByNativeChainId(tokenOut.chainId)
		const recipientBytes32 = padAddressToBytes32(recipient)

		const payInLZ = false

		const minAmountLD = this.subtractDustAndConvertDecimals(
			tokenIn.decimals,
			tokenOut.decimals,
			amount,
		)
		const sendParams = {
			dstEid: toChainEId,
			to: recipientBytes32,
			amountLD: amount,
			minAmountLD,
			extraOptions: EXTRA_OPTIONS,
			composeMsg: '0x' as Hex,
			oftCmd: '0x' as Hex,
		}

		const client = this.chainClientService.getClient(tokenIn.chainId)

		const { address: oftAddress } = await this.getOftAddress(tokenIn)
		const messagingFee = await client.readContract({
			address: oftAddress,
			abi: STARGATE_BASE_ABI,
			functionName: 'quoteSend',
			args: [sendParams, payInLZ],
		})

		return messagingFee as MessagingFee
	}

	private async quoteOFT(
		tokenIn: Token | NativeCurrency,
		tokenOut: Token | NativeCurrency,
		amount: bigint,
		recipient: Address,
	): Promise<[OFTLimit, OFTFeeDetail[], OFTReceipt]> {
		const toChainEId = getChainEIdByNativeChainId(tokenOut.chainId)
		const recipientBytes32 = padAddressToBytes32(recipient)

		const wallet = this.chainClientService.getWalletClient(tokenIn.chainId)

		const { address: oftAddress } = await this.getOftAddress(tokenIn)
		const contract = getContract({
			address: oftAddress,
			abi: OFT_ABI,
			client: wallet,
		})

		const result = await contract.read.quoteOFT([
			{
				dstEid: toChainEId,
				to: recipientBytes32,
				amountLD: amount,
				minAmountLD: this.subtractDustAndConvertDecimals(
					tokenIn.decimals,
					tokenOut.decimals,
					amount,
				),
				extraOptions: EXTRA_OPTIONS,
				composeMsg: '0x',
				oftCmd: '0x',
			},
		])

		return result as [OFTLimit, OFTFeeDetail[], OFTReceipt]
	}

	/**
	 * Calculates the expected amount out for a given quote and amount in
	 * @param quote
	 * @param amountIn
	 * @returns expectedAmountOut
	 */
	async quoteBridge(
		tokenIn: Token | NativeCurrency,
		tokenOut: Token | NativeCurrency,
		amountIn: bigint,
	): Promise<{
		quote: { messagingFee: MessagingFee }
		amountOut: bigint
		tokenOut: Token | NativeCurrency
		lzFee: TokenAmount
		gas: bigint
	}> {
		const quote = await this.quote(tokenIn, tokenOut, amountIn)

		const lzFee = new TokenAmount(
			this.chainClientService,
			this.tokenUtils.getNative(tokenIn.chainId),
			quote.messagingFee.nativeFee,
		)

		const amountOutOnDst = this.subtractDustAndConvertDecimals(
			tokenIn.decimals,
			tokenOut.decimals,
			amountIn,
		)

		return {
			quote,
			amountOut: amountOutOnDst,
			tokenOut,
			lzFee,
			gas: BRIDGE_GAS_COST,
		}
	}

	private subtractDust(tokenDecimals: number, amount: bigint) {
		return this.subtractDustAndConvertDecimals(
			tokenDecimals,
			tokenDecimals,
			amount,
		)
	}

	private subtractDustAndConvertDecimals(
		tokenInDecimals: number,
		tokenOutDecimals: number,
		amountIn: bigint,
	) {
		const sharedDecimals = 6
		const amountSD =
			amountIn / 10n ** BigInt(tokenInDecimals - sharedDecimals)

		const amountOutOnDst =
			amountSD * 10n ** BigInt(tokenOutDecimals - sharedDecimals)

		return amountOutOnDst
	}

	private validateBridgingAmount(oftLimit: OFTLimit, amount: bigint) {
		if (oftLimit.minAmountLD > amount) {
			throw new OftError(
				`Bridging min amount is greater than the amount, has ${oftLimit.minAmountLD}, needed ${amount}`,
			)
		}

		if (oftLimit.maxAmountLD < amount) {
			throw new OftError(
				`Bridging max amount is less than the amount, has ${oftLimit.maxAmountLD}, needed ${amount}`,
			)
		}
	}

	async getOftAddress(
		token: Token | NativeCurrency,
	): Promise<{ address: Address; isAdapter: boolean }> {
		const tokenIdAndAdapter = Object.entries(tokenIdToContract).find(
			([tokenId, adapterAddress]) =>
				token.id.toLowerCase() === tokenId.toLowerCase(),
		)

		if (tokenIdAndAdapter !== undefined)
			return { address: tokenIdAndAdapter[1], isAdapter: true }

		const isInCachedOft = this.cachedOft.get(
			token.id.toLowerCase() as TokenId,
		)

		if (isInCachedOft !== undefined && isInCachedOft === true)
			return { address: token.address, isAdapter: false }

		try {
			const chainClient = this.chainClientService.getClient(token.chainId)

			await chainClient.readContract({
				abi: OFT_ABI,
				functionName: 'oftVersion',
				address: token.address,
			})

			this.cachedOft.set(token.id.toLowerCase() as TokenId, true)

			return { address: token.address, isAdapter: false }
		} catch (error) {
			throw new OftError(
				`Could not obtain oft address for tokenId ${token.id}, probably you need to define adapter for this token, error msg: ${error instanceof Error ? error.message : ''}`,
			)
		}
	}
}
