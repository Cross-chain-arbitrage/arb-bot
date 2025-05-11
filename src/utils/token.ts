import { Address, erc20Abi, formatUnits, parseUnits } from "viem"
import { ERC20_ABI } from "../abi/erc20"
import { ClientManager } from "./ClientManager"

export const NATIVE_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"

export class Token {
	constructor(
		public address: Address,
		public decimals: number,
		public symbol: string,
		public chainId: number,
		public name?: string,
	) {
		this.address = address
		this.decimals = decimals
		this.name = name
		this.symbol = symbol
		this.chainId = chainId
	}

	static async fromAddress(
		address: Address,
		chainId: number,
	): Promise<Token> {
		const [decimals, name, symbol] = await Promise.all([
			this.getTokenDecimals(address, chainId),
			this.getTokenName(address, chainId),
			this.getTokenSymbol(address, chainId),
		])

		return new Token(address, decimals, symbol, chainId, name)
	}

	static async getTokenDecimals(
		tokenAddress: Address,
		chainId: number,
	): Promise<number> {
		const client = ClientManager.getClient(chainId)

		const decimals = await client.readContract({
			address: tokenAddress,
			abi: ERC20_ABI,
			functionName: "decimals",
		})
		return decimals
	}

	static async getTokenName(
		tokenAddress: Address,
		chainId: number,
	): Promise<string> {
		const client = ClientManager.getClient(chainId)

		const name = await client.readContract({
			address: tokenAddress,
			abi: ERC20_ABI,
			functionName: "name",
		})
		return name
	}

	static async getTokenSymbol(
		tokenAddress: Address,
		chainId: number,
	): Promise<string> {
		const client = ClientManager.getClient(chainId)

		const symbol = await client.readContract({
			address: tokenAddress,
			abi: ERC20_ABI,
			functionName: "symbol",
		})
		return symbol
	}

	async balanceOf(address: Address): Promise<bigint> {
		const client = ClientManager.getClient(this.chainId)

		const balance = await client.readContract({
			address: this.address,
			abi: erc20Abi,
			functionName: "balanceOf",
			args: [address],
		})
		return balance
	}

	async allowance(address: Address, spender: Address): Promise<bigint> {
		const client = ClientManager.getClient(this.chainId)

		const allowance = await client.readContract({
			address: this.address,
			abi: erc20Abi,
			functionName: "allowance",
			args: [address, spender],
		})
		return allowance
	}

	formatUnits(amount: bigint): string {
		return formatUnits(amount, this.decimals)
	}

	parseUnits(amount: string | bigint): bigint {
		return parseUnits(amount.toString(), this.decimals)
	}
}
