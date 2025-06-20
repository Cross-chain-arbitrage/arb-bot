import TTLCache from '@isaacs/ttlcache'
import { zeroAddress, zeroHash } from 'viem'
import { OFT_ABI } from '../../abi/stargate/oft'
import { STARGATE_BASE_ABI } from '../../abi/stargate/stargateBase'
import { STARGATE_POOL_ABI } from '../../abi/stargate/stgPool'
import { getChainEIdByNativeChainId } from '../../data-apis/layerzeroscan/utils'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { WrappedNative } from '../../primitives/tokens/WrappedNative'
import { ClientManager } from '../../utils/ClientManager'
import { createCustomError, padAddressToBytes32 } from '../../utils/common'
import { StargateAPI } from './StargateAPI'
import { StargateBridgeTx } from './StargateBridgeTx'
import { STARGATE_CHAINS } from './dumped/chains'

export const StargateError = createCustomError('StargateError')

const QUOTE_CACHE_TTL = 1000 * 60 * 1 // 1 minute

type RequestId = string

export class Stargate {
	static quoteCache = new TTLCache<RequestId, QuoteResult>({
		ttl: QUOTE_CACHE_TTL,
	})

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
	static async bridge(
		tokenIn: Token | NativeCurrency | WrappedNative,
		toChainId: number,
		recipient: Address,
		amount: bigint,
		simulateOnly: boolean = false,
	): Promise<{
		bridgeTx: StargateBridgeTx
		expectedAmountOut: bigint
		tokenOut: Token | NativeCurrency
	}> {
		if (amount <= 0n)
			throw new StargateError('Amount must be greater than 0')
		if (!recipient) throw new StargateError('Recipient address is required')
		if (!toChainId && toChainId >= 1)
			throw new StargateError('Destination chain ID is required')
		if (tokenIn.chainId === toChainId) {
			throw new StargateError('Cannot send to the same chain')
		}

		this.validateRecipient(tokenIn.chainId, recipient)

		const tokenMetadata = await StargateAPI.getTokenMetadata(tokenIn)

		const poolOrOFT = tokenMetadata.address

		const balance = await tokenIn.balanceOf(recipient)

		if (balance < amount) {
			throw new StargateError(
				`Insufficient balance, needed ${amount}, has ${balance}`,
			)
		}

		if (tokenIn instanceof Token) {
			await this.validateAllowance(recipient, poolOrOFT, amount, tokenIn)
		}

		const { quote, expectedAmountOut, tokenOut } =
			await Stargate.getExpectedAmountOut(tokenIn, amount, toChainId)

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

		const client = ClientManager.getClient(tokenIn.chainId)
		const wallet = ClientManager.getWalletClient(tokenIn.chainId)

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
				recipient,
			],
		})

		if (simulateOnly) {
			return {
				bridgeTx: new StargateBridgeTx(
					zeroHash,
					tokenIn,
					tokenOut,
					amount,
				),
				expectedAmountOut,
				tokenOut,
			}
		}

		const txHash = await wallet.writeContract(request)

		return {
			bridgeTx: new StargateBridgeTx(txHash, tokenIn, tokenOut, amount),
			expectedAmountOut,
			tokenOut,
		}
	}

	static async getBridgeAddress(
		token: Token | NativeCurrency,
	): Promise<Address> {
		const tokenMetadata = await StargateAPI.getTokenMetadata(token)

		return tokenMetadata.address
	}

	private static async validateAllowance(
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

	static async quote(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		amount: bigint,
	): Promise<QuoteResult> {
		const wallet = ClientManager.getWalletClient(tokenIn.chainId)

		return this.quoteWithRecipient(
			tokenIn,
			toChainId,
			wallet.account!.address,
			amount,
		)
	}

	static async quoteWithRecipient(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		recipient: Address,
		amount: bigint,
	): Promise<QuoteResult> {
		const tokenMetadata = await StargateAPI.getTokenMetadata(tokenIn)

		return await Stargate._quote(
			tokenMetadata,
			amount,
			recipient,
			toChainId,
			tokenIn.chainId,
		)
	}

	static async approveToBridge(
		tokenIn: Token | NativeCurrency,
		amount: bigint,
	) {
		if (tokenIn instanceof NativeCurrency) return

		const poolOrOFT = await Stargate.getBridgeAddress(tokenIn)

		const wallet = ClientManager.getWalletClient(tokenIn.chainId)
		const userAddr = wallet.account!.address

		const allowance = await tokenIn.allowance(userAddr, poolOrOFT)

		if (allowance >= amount) return

		const tx = await tokenIn.approve(poolOrOFT, amount)

		return tx
	}

	private static async _quote(
		metadata: StargateTokenMetadata,
		amount: bigint,
		recipient: Address,
		toChainId: number,
		fromChainId: number,
	): Promise<QuoteResult> {
		const cacheKey = this.getCacheKey(
			await TokenUtils.fromAddress(metadata.token.address, fromChainId),
			toChainId,
			amount,
		)

		const cachedQuote = this.quoteCache.get(cacheKey)

		if (cachedQuote) return cachedQuote

		const messagingFee = await Stargate.quoteSend(
			metadata.address,
			amount,
			recipient,
			toChainId,
			fromChainId,
		)

		const [oftLimit, oftFeeDetails, oftReceipt] = await Stargate.quoteOFT(
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

		this.quoteCache.set(cacheKey, result)

		return result
	}

	static async quoteSend(
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

		const client = ClientManager.getClient(fromChainId)

		const messagingFee = await client.readContract({
			address: token,
			abi: STARGATE_BASE_ABI,
			functionName: 'quoteSend',
			args: [sendParams, payInLZ],
		})

		return messagingFee as MessagingFee
	}

	static async quoteOFT(
		token: Address,
		amount: bigint,
		recipient: Address,
		toChainId: number,
		fromChainId: number,
	): Promise<[OFTLimit, OFTFeeDetail[], OFTReceipt]> {
		const toChainEId = getChainEIdByNativeChainId(toChainId)
		const recipientBytes32 = padAddressToBytes32(recipient)

		const client = ClientManager.getClient(fromChainId)

		const result = await client.readContract({
			address: token,
			abi: OFT_ABI,
			functionName: 'quoteOFT',
			args: [
				{
					dstEid: toChainEId,
					to: recipientBytes32,
					amountLD: amount,
					minAmountLD: amount,
					extraOptions: '0x',
					composeMsg: '0x',
					oftCmd: '0x',
				},
			],
		})

		return result as [OFTLimit, OFTFeeDetail[], OFTReceipt]
	}

	static async getPathCredits(
		pool: Address,
		toChainId: number,
		chainId: number,
	): Promise<bigint> {
		const client = ClientManager.getClient(chainId)

		if (chainId === toChainId) {
			throw new StargateError('Cannot getPath() to the same chain')
		}

		const remoteEId = getChainEIdByNativeChainId(toChainId)

		const credits = await client.readContract({
			address: pool,
			abi: STARGATE_POOL_ABI,
			functionName: 'paths',
			args: [remoteEId],
		})

		return credits
	}

	static getChainKey(chainId: number): string {
		const chain = STARGATE_CHAINS.find((chain) => chain.chainId === chainId)

		if (!chain) {
			throw new StargateError(
				`Chain with id ${chainId} not found in Stargate chain registry`,
			)
		}

		return chain.chainKey
	}

	static async getDstToken(
		srcToken: Token | NativeCurrency,
		toChainId: number,
	): Promise<Token | NativeCurrency> {
		const assetMetadata =
			await StargateAPI.getSameAssetMetadataAcrossChains(srcToken)

		const dstTokens = assetMetadata.filter(
			(token) => token.chainKey === Stargate.getChainKey(toChainId),
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

		return TokenUtils.fromAddress(dstToken.address, toChainId)
	}

	/**
	 * Calculates the expected amount out for a given quote and amount in
	 * @param quote
	 * @param amountIn
	 * @returns expectedAmountOut
	 */
	static async getExpectedAmountOut(
		tokenIn: Token | NativeCurrency,
		amountIn: bigint,
		toChainId: number,
	): Promise<{
		quote: QuoteResult
		expectedAmountOut: bigint
		tokenOut: Token | NativeCurrency
	}> {
		const quote = await this.quote(tokenIn, toChainId, amountIn)
		const tokenOut = await Stargate.getDstToken(tokenIn, toChainId)

		const sharedDecimals = 6
		const amountSD =
			amountIn / 10n ** BigInt(tokenIn.decimals - sharedDecimals)

		const amountOutOnDst =
			amountSD * 10n ** BigInt(tokenOut.decimals - sharedDecimals)

		return { quote, expectedAmountOut: amountOutOnDst, tokenOut }
	}

	private static getCacheKey(
		token: Token | NativeCurrency,
		toChainId: number,
		amount: bigint,
	): string {
		return `${token.chainId}:${token.address}:${toChainId}:${amount}`
	}

	static validateRecipient(chainId: number, recipient: Address) {
		if (recipient === zeroAddress) {
			throw new StargateError('Recipient cannot be the zero address')
		}

		const wallet = ClientManager.getWalletClient(chainId)

		if (wallet.account!.address !== recipient) {
			throw new StargateError(
				'Recipient is not the same as the wallet address',
			)
		}
	}

	static validateBridgingAmount(oftLimit: OFTLimit, amount: bigint) {
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
