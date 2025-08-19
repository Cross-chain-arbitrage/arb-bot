import { Injectable } from '@nestjs/common'
import { getContract, zeroAddress, zeroHash } from 'viem'
import { OFT_ABI } from '../../../abi/stargate/oft'
import { STARGATE_BASE_ABI } from '../../../abi/stargate/stargateBase'
import { ChainClientService } from '../../../chain-client/chain-client.service'
import { NativeCurrency } from '../../../primitives/tokens/NativeCurrency'
import { Token } from '../../../primitives/tokens/Token'
import { TokenAmount } from '../../../primitives/tokens/TokenAmount'
import { TokenUtils } from '../../../primitives/tokens/TokenUtils'
import { WrappedNative } from '../../../primitives/tokens/WrappedNative'
import { createCustomError, padAddressToBytes32 } from '../../../utils/common'
import { LayerZeroScanService } from '../layerzero-scan/layerzero-scan.service'
import { getChainEIdByNativeChainId } from '../layerzero.utils'
import { StargateAPIService } from './stargate-api.service'
import { StargateBridgeTx } from './stargate-tx'
import { getStargateChainKey } from './stargate.utils'
export const StargateError = createCustomError('StargateError')

const BRIDGE_GAS_COST = 400_000n

@Injectable()
export class StargateService {
	constructor(
		private readonly chainClientService: ChainClientService,
		private readonly tokenUtils: TokenUtils,
		private readonly stargateAPIService: StargateAPIService,
		private readonly layerZeroScanService: LayerZeroScanService,
	) {}

	/**
	 * Bridges `tokenIn` to `recipient` on `toChainId`
	 * @param tokenIn - Token or NativeCurrency to bridge
	 * @param toChainId - Destination chain ID
	 * @param recipient - Recipient address
	 * @param amount - Amount to bridge
	 * @param simulateOnly - If true, only simulate the bridge and return the expected amount out and txHash = bytes32(0)
	 * @returns {bridgeTx: StargateBridgeTx, expectedAmountOut: bigint}
	 * @dev Bridging amount is affected by following factors: bridge fee, src vs dst token decimals diff, etc.
	 */
	async bridge(
		tokenIn: Token | NativeCurrency | WrappedNative,
		tokenOut: Token | NativeCurrency | WrappedNative,
		amount: bigint,
		simulateOnly: boolean = false,
	): Promise<{
		bridgeTx: StargateBridgeTx
		amountOut: bigint
		lzFee: TokenAmount
	}> {
		const toChainId = tokenOut.chainId

		if (amount <= 0n)
			throw new StargateError('Amount must be greater than 0')
		if (!toChainId && toChainId >= 1)
			throw new StargateError('Destination chain ID is required')
		if (tokenIn.chainId === toChainId) {
			throw new StargateError('Cannot send to the same chain')
		}

		const tokenMetadata =
			await this.stargateAPIService.getTokenMetadata(tokenIn)

		const poolOrOFT = tokenMetadata.address

		const wallet = this.chainClientService.getWalletClient(tokenIn.chainId)
		const recipient = wallet.account.address
		const balance = await tokenIn.balanceOf(wallet.account.address)

		if (balance < amount) {
			throw new StargateError(
				`Insufficient balance, needed ${amount}, has ${balance}`,
			)
		}

		if (tokenIn instanceof Token) {
			await this.validateAllowance(recipient, poolOrOFT, amount, tokenIn)
		}

		const { quote, amountOut } = await this.quoteBridge(
			tokenIn,
			amount,
			toChainId,
		)

		this.validateBridgingAmount(quote.oftLimit, amount)

		const toChainEId = getChainEIdByNativeChainId(toChainId)
		const recipientBytes32 = padAddressToBytes32(recipient)
		const minAmountLD = quote.oftReceipt.amountReceivedLD

		const sendParams = {
			dstEid: toChainEId,
			to: recipientBytes32,
			amountLD: amount,
			minAmountLD,
			extraOptions: '0x' as Hex,
			composeMsg: '0x' as Hex,
			oftCmd: '0x' as Hex,
		}

		const client = this.chainClientService.getClient(tokenIn.chainId)

		const isNative = tokenIn instanceof NativeCurrency
		const value = quote.messagingFee.nativeFee + (isNative ? amount : 0n)

		const { request } = await client.simulateContract({
			account: wallet.account,
			address: poolOrOFT,
			abi: STARGATE_BASE_ABI,
			functionName: 'send',
			value,
			args: [
				sendParams,
				quote.messagingFee as { nativeFee: bigint; lzTokenFee: bigint },
				wallet.account.address,
			],
		})

		if (simulateOnly) {
			return {
				bridgeTx: new StargateBridgeTx(
					this.layerZeroScanService,
					zeroHash,
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

		const txHash = await wallet.writeContract(request)

		return {
			bridgeTx: new StargateBridgeTx(
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

	async getBridgeAddress(token: Token | NativeCurrency): Promise<Address> {
		const tokenMetadata =
			await this.stargateAPIService.getTokenMetadata(token)

		return tokenMetadata.address
	}

	private async validateAllowance(
		recipient: Address,
		poolOrOFT: Address,
		amount: bigint,
		token: Token,
	): Promise<void> {
		const allowance = await token.allowance(recipient, poolOrOFT)

		if (allowance >= amount) return

		throw new StargateError(
			`Insufficient allowance, needed ${amount}, has ${allowance}`,
		)
	}

	private async quote(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		amount: bigint,
	): Promise<QuoteResult> {
		const wallet = this.chainClientService.getWalletClient(tokenIn.chainId)

		return this.quoteWithRecipient(
			tokenIn,
			toChainId,
			wallet.account.address,
			amount,
		)
	}

	private async quoteWithRecipient(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		recipient: Address,
		amount: bigint,
	): Promise<QuoteResult> {
		const tokenMetadata =
			await this.stargateAPIService.getTokenMetadata(tokenIn)

		return await this._quote(
			tokenMetadata,
			amount,
			recipient,
			toChainId,
			tokenIn.chainId,
		)
	}

	async approveToBridge(tokenIn: Token | NativeCurrency, amount: bigint) {
		if (tokenIn instanceof NativeCurrency) return

		const poolOrOFT = await this.getBridgeAddress(tokenIn)

		const wallet = this.chainClientService.getWalletClient(tokenIn.chainId)
		const userAddr = wallet.account.address

		const allowance = await tokenIn.allowance(userAddr, poolOrOFT)

		if (allowance >= amount) return

		const tx = await tokenIn.approve(poolOrOFT, amount)

		return tx
	}

	private async _quote(
		metadata: StargateTokenMetadata,
		amount: bigint,
		recipient: Address,
		toChainId: number,
		fromChainId: number,
	): Promise<QuoteResult> {
		const messagingFee = await this.quoteSend(
			metadata.address,
			amount,
			recipient,
			toChainId,
			fromChainId,
		)

		const [oftLimit, oftFeeDetails, oftReceipt] = await this.quoteOFT(
			metadata.address,
			amount,
			recipient,
			toChainId,
			fromChainId,
		)

		if (oftLimit.minAmountLD > amount) {
			throw new StargateError(
				`Bridging min amount is greater than the amount, has ${oftLimit.minAmountLD}, needed ${amount}`,
			)
		}

		if (oftLimit.maxAmountLD < amount) {
			throw new StargateError(
				`Bridging max amount is less than the amount, has ${oftLimit.maxAmountLD}, needed ${amount}`,
			)
		}

		const result: QuoteResult = {
			messagingFee,
			oftLimit,
			oftFeeDetails,
			oftReceipt,
		}

		return result
	}

	private async quoteSend(
		token: Address,
		amount: bigint,
		recipient: Address,
		toChainId: number,
		fromChainId: number,
	): Promise<MessagingFee> {
		const toChainEId = getChainEIdByNativeChainId(toChainId)
		const recipientBytes32 = padAddressToBytes32(recipient)

		const payInLZ = false

		const sendParams = {
			dstEid: toChainEId,
			to: recipientBytes32,
			amountLD: amount,
			minAmountLD: amount,
			extraOptions: '0x' as Hex,
			composeMsg: '0x' as Hex,
			oftCmd: '0x' as Hex,
		}

		const client = this.chainClientService.getClient(fromChainId)

		const messagingFee = await client.readContract({
			address: token,
			abi: STARGATE_BASE_ABI,
			functionName: 'quoteSend',
			args: [sendParams, payInLZ],
		})

		return messagingFee as MessagingFee
	}

	private async quoteOFT(
		token: Address,
		amount: bigint,
		recipient: Address,
		toChainId: number,
		fromChainId: number,
	): Promise<[OFTLimit, OFTFeeDetail[], OFTReceipt]> {
		const toChainEId = getChainEIdByNativeChainId(toChainId)
		const recipientBytes32 = padAddressToBytes32(recipient)

		const wallet = this.chainClientService.getWalletClient(fromChainId)

		const contract = getContract({
			address: token,
			abi: OFT_ABI,
			client: wallet,
		})

		const result = await contract.read.quoteOFT([
			{
				dstEid: toChainEId,
				to: recipientBytes32,
				amountLD: amount,
				minAmountLD: amount,
				extraOptions: '0x',
				composeMsg: '0x',
				oftCmd: '0x',
			},
		])

		return result as [OFTLimit, OFTFeeDetail[], OFTReceipt]
	}

	private async getDstToken(
		srcToken: Token | NativeCurrency,
		toChainId: number,
	): Promise<Token | NativeCurrency> {
		const assetMetadata =
			await this.stargateAPIService.getSameAssetMetadataAcrossChains(
				srcToken,
			)

		const dstTokens = assetMetadata.filter(
			(token) => token.chainKey === getStargateChainKey(toChainId),
		)

		if (dstTokens.length > 1) {
			throw new StargateError(
				`Multiple tokens found for ${srcToken.symbol} on chain ${toChainId}`,
			)
		}

		if (dstTokens.length === 0) {
			throw new StargateError(
				`No token found for ${srcToken.symbol} on chain ${toChainId}`,
			)
		}

		const dstToken = dstTokens[0].token

		return this.tokenUtils.fromAddress(dstToken.address, toChainId)
	}

	/**
	 * Calculates the expected amount out for a given quote and amount in
	 * @param quote
	 * @param amountIn
	 * @returns expectedAmountOut
	 */
	async quoteBridge(
		tokenIn: Token | NativeCurrency,
		amountIn: bigint,
		toChainId: number,
	): Promise<{
		quote: QuoteResult
		amountOut: bigint
		tokenOut: Token | NativeCurrency
		lzFee: TokenAmount
		gas: bigint
	}> {
		const quote = await this.quote(tokenIn, toChainId, amountIn)
		const tokenOut = await this.getDstToken(tokenIn, toChainId)

		const sharedDecimals = 6
		const amountSD =
			amountIn / 10n ** BigInt(tokenIn.decimals - sharedDecimals)

		const amountOutOnDst =
			amountSD * 10n ** BigInt(tokenOut.decimals - sharedDecimals)

		const lzFee = new TokenAmount(
			this.chainClientService,
			this.tokenUtils.getNative(tokenIn.chainId),
			quote.messagingFee.nativeFee,
		)

		return {
			quote,
			amountOut: amountOutOnDst,
			tokenOut,
			lzFee,
			gas: BRIDGE_GAS_COST,
		}
	}

	private validateRecipient(chainId: number, recipient: Address) {
		if (recipient === zeroAddress) {
			throw new StargateError('Recipient cannot be the zero address')
		}

		const wallet = this.chainClientService.getWalletClient(chainId)

		if (wallet.account.address !== recipient) {
			throw new StargateError(
				'Recipient is not the same as the wallet address',
			)
		}
	}

	private validateBridgingAmount(oftLimit: OFTLimit, amount: bigint) {
		if (oftLimit.minAmountLD > amount) {
			throw new StargateError(
				`Expected amount out is less than the amount, has ${oftLimit.minAmountLD}, needed ${amount}`,
			)
		} else if (oftLimit.maxAmountLD < amount) {
			throw new StargateError(
				`Expected amount out is greater than the amount, has ${oftLimit.maxAmountLD}, needed ${amount}`,
			)
		}
	}
}
