import { Address, formatEther, formatUnits, Hex, WalletClient } from "viem"
import { getChainEIdByNativeChainId } from "../layerzero/utils"
import { padAddressToBytes32 } from "../utils/types"
import { Token } from "../utils/token"
import { STARGATE_BASE_ABI } from "../abi/stargate/stargateBase"
import { ClientManager } from "../utils/ClientManager"
import { OFT_ABI } from "../abi/stargate/oft"
import { STARGATE_POOL_ABI } from "../abi/stargate/stgPool"
import { StargateAPI } from "./StargateAPI"
import { CHAIN_KEYS } from "./dumped/chains"

export class Stargate {
	// zero address is considered native token by Stargate
	async send(
		token: Token,
		amount: bigint,
		recipient: Address,
		toChainId: number,
		wallet: WalletClient,
	) {
		const tokenMetadata = await StargateAPI.getStargateTokenMetadata(
			token,
			this.getChainKey(token.chainId),
		)
		const poolOrOFT = tokenMetadata.address as Address

		if (token.chainId === toChainId) {
			throw new Error("Cannot sendOft() to the same chain")
		}

		const pathCredits = await this.getPathCredits(
			poolOrOFT,
			toChainId,
			token.chainId,
		)

		if (pathCredits === 0n) {
			throw new Error(
				`No credits for bridging ${poolOrOFT} from ${wallet.chain?.id} to ${toChainId}`,
			)
		}

		const tokenBalance = await token.balanceOf(recipient)
		const allowance = await token.allowance(recipient, poolOrOFT)

		if (tokenBalance < amount) {
			throw new Error(
				`Insufficient balance, needed ${amount}, has ${tokenBalance}`,
			)
		}

		if (allowance < amount) {
			throw new Error(
				`Insufficient allowance, needed ${amount}, has ${allowance}`,
			)
		}

		console.log("Sending", amount, "of", poolOrOFT, "to", recipient)
		console.log(`From: ${wallet.chain?.id}`)
		console.log(`To: ${toChainId}`)

		const toChainEId = getChainEIdByNativeChainId(toChainId)
		const recipientBytes32 = padAddressToBytes32(recipient)
		const refundAddress = recipient

		console.log("Path credits:", pathCredits)

		const { messagingFee, oftFees } = await this.quote(
			tokenMetadata,
			amount,
			recipient,
			toChainId,
			token.chainId,
		)

		console.log("--------------------------------")
		console.log("Messaging fee:", formatEther(messagingFee.nativeFee))

		if (oftFees) {
			console.log(
				"OFT limits:",
				formatUnits(oftFees.oftLimit.minAmountLD, token.decimals),
				"-",
				formatUnits(oftFees.oftLimit.maxAmountLD, token.decimals),
			)
			console.log("OFT fee details:", oftFees.oftFeeDetails)
			console.log("OFT receipt:", oftFees.oftReceipt)
		}
		console.log("--------------------------------")

		// if OFT, use the min amount from quote
		const minAmountLD = oftFees?.oftLimit.minAmountLD ?? amount

		const sendParams = {
			dstEid: toChainEId,
			to: recipientBytes32,
			amountLD: amount,
			minAmountLD,
			extraOptions: "0x" as Hex,
			composeMsg: "0x" as Hex,
			oftCmd: "0x" as Hex,
		}

		const client = ClientManager.getClient(token.chainId)

		const { request } = await client.simulateContract({
			account: wallet.account,
			address: poolOrOFT,
			abi: STARGATE_BASE_ABI,
			functionName: "send",
			value: messagingFee.nativeFee,
			args: [
				sendParams,
				messagingFee as { nativeFee: bigint; lzTokenFee: bigint },
				refundAddress,
			],
		})

		const txHash = await wallet.writeContract(request)

		console.log("\nSuccessful Tx!")
		console.log("Hash:", txHash)
	}

	async quote(
		metadata: StargateTokenMetadata,
		amount: bigint,
		recipient: Address,
		toChainId: number,
		fromChainId: number,
	): Promise<QuoteResult> {
		const messagingFee = await this.quoteSend(
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
					await this.quoteOFT(
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
				throw new Error("Invalid stargate type")
		}
	}

	async quoteSend(
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

	async quoteOFT(
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

	async getPathCredits(
		pool: Address,
		toChainId: number,
		chainId: number,
	): Promise<bigint> {
		const client = ClientManager.getClient(chainId)

		if (chainId === toChainId) {
			throw new Error("Cannot getPath() to the same chain")
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

	getChainKey(chainId: number): string {
		const chain = CHAIN_KEYS.find((chain) => chain.chainId === chainId)
		if (!chain) {
			throw new Error(
				`Chain with id ${chainId} not found in Stargate chain registry`,
			)
		}
		return chain.chainKey
	}
}
