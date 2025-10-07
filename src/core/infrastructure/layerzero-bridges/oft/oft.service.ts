import { Injectable } from '@nestjs/common'
import { getContract, zeroAddress } from 'viem'
import { createCustomError } from '../../../../utils/common'
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
import { chainIdToNativeOftAddress } from './chain-to-native-oft'

const EXTRA_OPTIONS = '0x00030100110100000000000000000000000000030d40' as Hex //gas on dst, the value is from lz documentation
export const OftError = createCustomError('OftError')
const BRIDGE_GAS_COST = 400_000n

@Injectable()
export class OftService {
	constructor(
		private readonly chainClientService: ChainClientService,
		private readonly tokenUtils: TokenUtils,
		private readonly layerZeroScanService: LayerZeroScanService,
	) {}

	/**
	 * Bridges `tokenIn` to `recipient` on `toChainId`
	 * @param tokenIn - Token or NativeCurrency to bridge
	 * @param toChainId - Destination chain ID
	 * @param recipient - Recipient address
	 * @param amount - Amount to bridge
	 * @returns {bridgeTx: OftBridgeTx, expectedAmountOut: bigint}
	 * @dev Bridging amount is affected by following factors: bridge fee, src vs dst token decimals diff, etc.
	 */
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

		if (amount <= 0n) throw new OftError('Amount must be greater than 0')
		if (!toChainId && toChainId >= 1)
			throw new OftError('Destination chain ID is required')
		if (tokenIn.chainId === toChainId) {
			throw new OftError('Cannot send to the same chain')
		}

		const oftAddress = this.getOftAddress(tokenIn)

		const wallet = this.chainClientService.getWalletClient(tokenIn.chainId)
		const recipient = wallet.account.address
		const balance = await tokenIn.balanceOf(wallet.account.address)

		if (balance < amount) {
			throw new OftError(
				`Insufficient balance, needed ${amount}, has ${balance}`,
			)
		}

		// if (tokenIn instanceof Token) {
		// 	await this.validateAllowance(recipient, poolOrOFT, amount, tokenIn)
		// }

		const { quote, amountOut } = await this.quoteBridge(
			tokenIn,
			tokenOut,
			amount,
		)

		const toChainEId = getChainEIdByNativeChainId(toChainId)
		const recipientBytes32 = padAddressToBytes32(recipient)
		const minAmountLD = this.calcDstAmountOut(
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
		//TODO: It takes amount out, because this value has to be with removed dust. Need to consider case with different decimals
		const value =
			quote.messagingFee.nativeFee + (isNative ? minAmountLD : 0n)

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

	// private async validateAllowance(
	// 	recipient: Address,
	// 	poolOrOFT: Address,
	// 	amount: bigint,
	// 	token: Token,
	// ): Promise<void> {
	// 	const allowance = await token.allowance(recipient, poolOrOFT)

	// 	if (allowance >= amount) return

	// 	throw new OftError(
	// 		`Insufficient allowance, needed ${amount}, has ${allowance}`,
	// 	)
	// }

	private async quote(
		tokenIn: Token | NativeCurrency,
		tokenOut: Token | NativeCurrency,
		amount: bigint,
	): Promise<{ messagingFee: MessagingFee }> {
		const wallet = this.chainClientService.getWalletClient(tokenIn.chainId)

		return this._quote(tokenIn, tokenOut, amount, wallet.account.address)
	}

	// async approveToBridge(tokenIn: Token | NativeCurrency, amount: bigint) {
	// 	if (tokenIn instanceof NativeCurrency) return

	// 	const poolOrOFT = await this.getBridgeAddress(tokenIn)

	// 	const wallet = this.chainClientService.getWalletClient(tokenIn.chainId)
	// 	const userAddr = wallet.account.address

	// 	const allowance = await tokenIn.allowance(userAddr, poolOrOFT)

	// 	if (allowance >= amount) return

	// 	const tx = await tokenIn.approve(poolOrOFT, amount)

	// 	return tx
	// }

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
		if (tokenIn instanceof NativeCurrency) return { messagingFee }

		const [oftLimit, oftFeeDetails, oftReceipt] = await this.quoteOFT(
			tokenIn,
			tokenOut,
			amount,
			recipient,
		)

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

		const result: QuoteResult = {
			messagingFee,
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

		const minAmountLD = this.calcDstAmountOut(
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

		const oftAddress = this.getOftAddress(tokenIn)
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

		const oftAddress = this.getOftAddress(tokenIn)
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
				minAmountLD: this.calcDstAmountOut(
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

		const amountOutOnDst = this.calcDstAmountOut(
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

	private calcDstAmountOut(
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

	private validateRecipient(chainId: number, recipient: Address) {
		if (recipient === zeroAddress) {
			throw new OftError('Recipient cannot be the zero address')
		}

		const wallet = this.chainClientService.getWalletClient(chainId)

		if (wallet.account.address !== recipient) {
			throw new OftError(
				'Recipient is not the same as the wallet address',
			)
		}
	}

	private validateBridgingAmount(oftLimit: OFTLimit, amount: bigint) {
		if (oftLimit.minAmountLD > amount) {
			throw new OftError(
				`Expected amount out is less than the amount, has ${oftLimit.minAmountLD}, needed ${amount}`,
			)
		} else if (oftLimit.maxAmountLD < amount) {
			throw new OftError(
				`Expected amount out is greater than the amount, has ${oftLimit.maxAmountLD}, needed ${amount}`,
			)
		}
	}

	getOftAddress(token: Token | NativeCurrency): Address {
		if (token instanceof Token) return token.address

		const chainId = token.chainId
		const oftAddress = chainIdToNativeOftAddress[chainId]

		if (!oftAddress)
			throw new OftError(
				`Native OFT address is not found for chainId ${chainId}`,
			)

		return oftAddress
	}
}
