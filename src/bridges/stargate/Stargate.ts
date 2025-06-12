import { formatEther, zeroHash } from 'viem'
import { OFT_ABI } from '../../abi/stargate/oft'
import { STARGATE_BASE_ABI } from '../../abi/stargate/stargateBase'
import { STARGATE_POOL_ABI } from '../../abi/stargate/stgPool'
import { getChainEIdByNativeChainId } from '../../data-apis/layerzeroscan/utils'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { ClientManager } from '../../utils/ClientManager'
import logger from '../../utils/logger'
import { padAddressToBytes32 } from '../../utils/types'
import { StargateAPI } from './StargateAPI'
import { StargateBridgeTx } from './StargateBridgeTx'
import { STARGATE_CHAINS } from './dumped/chains'

export class StargateError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, StargateError.prototype)
		this.name = 'StargateError'
	}
}

export class Stargate {
	static async bridge(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		recipient: Address,
		amount: bigint,
		simulateOnly: boolean = false,
	) {
		if (amount <= 0n)
			throw new StargateError('Amount must be greater than 0')
		if (!recipient) throw new StargateError('Recipient address is required')
		if (!toChainId && toChainId >= 1)
			throw new StargateError('Destination chain ID is required')
		if (tokenIn.chainId === toChainId) {
			throw new StargateError('Cannot send to the same chain')
		}

		const tokenMetadata = await StargateAPI.getTokenMetadata(
			tokenIn,
			Stargate.getChainKey(tokenIn.chainId),
		)

		const poolOrOFT = tokenMetadata.address

		await Stargate.validatePathCredits(
			poolOrOFT,
			toChainId,
			tokenIn.chainId,
			// amount,
		)

		const balance = await tokenIn.balanceOf(recipient)

		if (balance < amount) {
			throw new StargateError(
				`Insufficient balance, needed ${amount}, has ${balance}`,
			)
		}

		if (tokenIn instanceof Token) {
			await this.validateAllowance(recipient, poolOrOFT, amount, tokenIn)
		}

		const quote = await Stargate._quote(
			tokenMetadata,
			amount,
			recipient,
			toChainId,
			tokenIn.chainId,
		)

		const toChainEId = getChainEIdByNativeChainId(toChainId)
		const recipientBytes32 = padAddressToBytes32(recipient)
		const minAmountLD = quote.isOFT
			? (quote.oftFees?.oftLimit.minAmountLD ?? amount)
			: amount

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

		Stargate.logTransactionDetails(tokenIn, quote)

		if (simulateOnly) {
			return new StargateBridgeTx(
				zeroHash,
				tokenIn.chainId,
				tokenIn,
				amount,
			)
		}

		const txHash = await wallet.writeContract(request)

		return new StargateBridgeTx(txHash, tokenIn.chainId, tokenIn, amount)
	}

	private static async validatePathCredits(
		poolOrOFT: Address,
		toChainId: number,
		chainId: number,
		// amount: bigint,
	): Promise<void> {
		const pathCredits = await Stargate.getPathCredits(
			poolOrOFT,
			toChainId,
			chainId,
		)

		if (pathCredits === 0n) {
			throw new StargateError(
				`Bridge path doesn't exist for ${poolOrOFT} from ${chainId} to ${toChainId}`,
			)
		}

		// TODO: find a way to get bridging limit and validate it

		// if (pathCredits < amount) {
		// 	throw new StargateError(
		// 		`Not enough credits for bridging ${poolOrOFT} from ${chainId} to ${toChainId}, needed ${amount}, has ${pathCredits}`,
		// 	)
		// }
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

	private static logTransactionDetails(
		token: Token | NativeCurrency,
		quote: QuoteResult,
	): void {
		logger.info(`--------------------------------`)
		logger.info(
			`Messaging fee: ${formatEther(quote.messagingFee.nativeFee)}`,
		)

		if (quote.isOFT) {
			logger.info(
				`OFT limits: ${token.formatUnits(quote.oftFees?.oftLimit.minAmountLD ?? 0n)} - ${token.formatUnits(quote.oftFees?.oftLimit.maxAmountLD ?? 0n)}`,
			)
			// logger.info(`OFT fee details: ${quote.oftFees?.oftFeeDetails}`)
			// logger.info(
			// 	`OFT receipt: ${JSON.stringify(quote.oftFees?.oftReceipt)}`,
			// )
		}
		logger.info('--------------------------------')
	}

	static async quote(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		recipient: Address,
		amount: bigint,
	) {
		const tokenMetadata = await StargateAPI.getTokenMetadata(
			tokenIn,
			Stargate.getChainKey(tokenIn.chainId),
		)

		return await Stargate._quote(
			tokenMetadata,
			amount,
			recipient,
			toChainId,
			tokenIn.chainId,
		)
	}

	private static async _quote(
		metadata: StargateTokenMetadata,
		amount: bigint,
		recipient: Address,
		toChainId: number,
		fromChainId: number,
	): Promise<QuoteResult> {
		const messagingFee = await Stargate.quoteSend(
			metadata.address,
			amount,
			recipient,
			toChainId,
			fromChainId,
		)

		switch (metadata.stargateType) {
			case 'POOL':
				return {
					isOFT: false,
					messagingFee,
				}
			case 'OFT': {
				const [oftLimit, oftFeeDetails, oftReceipt] =
					await Stargate.quoteOFT(
						metadata.address,
						amount,
						recipient,
						toChainId,
						fromChainId,
					)

				if (oftLimit.minAmountLD > amount) {
					throw new StargateError(
						`Bridging min amount is greater than the amount, needed ${oftLimit.minAmountLD}, has ${amount}`,
					)
				}

				if (oftLimit.maxAmountLD < amount) {
					throw new StargateError(
						`Bridging max amount is less than the amount, needed ${oftLimit.maxAmountLD}, has ${amount}`,
					)
				}

				return {
					isOFT: true,
					messagingFee,
					oftFees: {
						oftLimit,
						oftFeeDetails,
						oftReceipt,
					},
				}
			}
			case 'NATIVE':
				return {
					isOFT: false,
					messagingFee,
				}
			default:
				throw new StargateError('Invalid stargate type')
		}
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
}
