import { Address, formatEther, Hex, WalletClient } from "viem"
import { getChainEIdByNativeChainId } from "../layerzero/utils"
import { padAddressToBytes32 } from "../utils/types"
import { Token } from "../utils/tokens/Token"
import { STARGATE_BASE_ABI } from "../abi/stargate/stargateBase"
import { ClientManager } from "../utils/ClientManager"
import { OFT_ABI } from "../abi/stargate/oft"
import { STARGATE_POOL_ABI } from "../abi/stargate/stgPool"
import { StargateAPI } from "./StargateAPI"
import { STARGATE_CHAINS } from "./dumped/chains"
import { NativeCurrency } from "../utils/tokens/NativeCurrency"

export class StargateError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, StargateError.prototype)
		this.name = "StargateError"
	}
}

export class Stargate {
	static async send(
		token: Token | NativeCurrency,
		amount: bigint,
		recipient: Address,
		toChainId: number,
		wallet: WalletClient,
	): Promise<Hex> {
		if (amount <= 0n)
			throw new StargateError("Amount must be greater than 0")
		if (!recipient) throw new StargateError("Recipient address is required")
		if (!toChainId)
			throw new StargateError("Destination chain ID is required")

		const tokenMetadata = await StargateAPI.getTokenMetadata(
			token,
			Stargate.getChainKey(token.chainId),
		)

		const poolOrOFT = tokenMetadata.address as Address

		if (token.chainId === toChainId) {
			throw new StargateError("Cannot send to the same chain")
		}

		await Stargate.validatePathCredits(poolOrOFT, toChainId, token.chainId)

		const isEnoughBalance = await token.hasEnoughBalance(recipient, amount)

		if (!isEnoughBalance) {
			throw new StargateError(
				`Insufficient balance, needed ${amount}, has ${isEnoughBalance}`,
			)
		}

		if (token instanceof Token) {
			await this.validateAllowance(recipient, poolOrOFT, amount, token)
		}

		const quote = await Stargate.quote(
			tokenMetadata,
			amount,
			recipient,
			toChainId,
			token.chainId,
		)

		Stargate.logTransactionDetails(
			token,
			amount,
			poolOrOFT,
			recipient,
			toChainId,
			quote,
		)

		return Stargate.executeTransaction(
			poolOrOFT,
			amount,
			recipient,
			toChainId,
			token.chainId,
			wallet,
			quote,
		)
	}

	private static async validatePathCredits(
		poolOrOFT: Address,
		toChainId: number,
		chainId: number,
	): Promise<void> {
		const pathCredits = await Stargate.getPathCredits(
			poolOrOFT,
			toChainId,
			chainId,
		)

		if (pathCredits === 0n) {
			throw new StargateError(
				`No credits for bridging ${poolOrOFT} from ${chainId} to ${toChainId}`,
			)
		}
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
		amount: bigint,
		poolOrOFT: Address,
		recipient: Address,
		toChainId: number,
		quote: QuoteResult,
	): void {
		console.log("Sending", amount, "of", poolOrOFT, "to", recipient)
		console.log(`To: ${toChainId}`)
		console.log("--------------------------------")
		console.log("Messaging fee:", formatEther(quote.messagingFee.nativeFee))

		if (quote.isOFT) {
			console.log(
				"OFT limits:",
				token.formatUnits(quote.oftFees?.oftLimit.minAmountLD ?? 0n),
				"-",
				token.formatUnits(quote.oftFees?.oftLimit.maxAmountLD ?? 0n),
			)
			console.log("OFT fee details:", quote.oftFees?.oftFeeDetails)
			console.log("OFT receipt:", quote.oftFees?.oftReceipt)
		}
		console.log("--------------------------------")
	}

	private static async executeTransaction(
		poolOrOFT: Address,
		amount: bigint,
		recipient: Address,
		toChainId: number,
		chainId: number,
		wallet: WalletClient,
		quote: QuoteResult,
	): Promise<Hex> {
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
			extraOptions: "0x" as Hex,
			composeMsg: "0x" as Hex,
			oftCmd: "0x" as Hex,
		}

		const client = ClientManager.getClient(chainId)

		const { request } = await client.simulateContract({
			account: wallet.account,
			address: poolOrOFT,
			abi: STARGATE_BASE_ABI,
			functionName: "send",
			value: quote.messagingFee.nativeFee,
			args: [
				sendParams,
				quote.messagingFee as { nativeFee: bigint; lzTokenFee: bigint },
				recipient,
			],
		})

		const txHash = await wallet.writeContract(request)
		console.log("\nSuccessful Tx!")
		console.log("Hash:", txHash)

		return txHash
	}

	static async quote(
		metadata: StargateTokenMetadata,
		amount: bigint,
		recipient: Address,
		toChainId: number,
		fromChainId: number,
	): Promise<QuoteResult> {
		const messagingFee = await Stargate.quoteSend(
			metadata.address as Address,
			amount,
			recipient,
			toChainId,
			fromChainId,
		)

		switch (metadata.stargateType) {
			case "POOL":
				return {
					isOFT: false,
					messagingFee,
				}
			case "OFT": {
				const [oftLimit, oftFeeDetails, oftReceipt] =
					await Stargate.quoteOFT(
						metadata.address as Address,
						amount,
						recipient,
						toChainId,
						fromChainId,
					)

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
			case "NATIVE":
				return {
					isOFT: false,
					messagingFee,
				}
			default:
				throw new StargateError("Invalid stargate type")
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
			extraOptions: "0x" as Hex,
			composeMsg: "0x" as Hex,
			oftCmd: "0x" as Hex,
		}

		const client = ClientManager.getClient(fromChainId)

		const messagingFee = await client.readContract({
			address: token,
			abi: STARGATE_BASE_ABI,
			functionName: "quoteSend",
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
			functionName: "quoteOFT",
			args: [
				{
					dstEid: toChainEId,
					to: recipientBytes32,
					amountLD: amount,
					minAmountLD: amount,
					extraOptions: "0x",
					composeMsg: "0x",
					oftCmd: "0x",
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
			throw new StargateError("Cannot getPath() to the same chain")
		}

		const remoteEId = getChainEIdByNativeChainId(toChainId)
		const credits = await client.readContract({
			address: pool,
			abi: STARGATE_POOL_ABI,
			functionName: "paths",
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
