import { Address, erc20Abi, PublicClient } from "viem"
import { ERC20_ABI } from "../abi/erc20"

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
		client: PublicClient,
	): Promise<Token> {
		const decimals = await this.getTokenDecimals(address, client)
		const name = await this.getTokenName(address, client)
		const symbol = await this.getTokenSymbol(address, client)
		const chainId = client.chain?.id

		if (!chainId) {
			throw new Error("Chain id not found in client")
		}

		return new Token(address, decimals, symbol, chainId, name)
	}

	static async getTokenDecimals(
		tokenAddress: Address,
		client: PublicClient,
	): Promise<number> {
		const decimals = await client.readContract({
			address: tokenAddress,
			abi: ERC20_ABI,
			functionName: "decimals",
		})
		return decimals
	}

	static async getTokenName(
		tokenAddress: Address,
		client: PublicClient,
	): Promise<string> {
		const name = await client.readContract({
			address: tokenAddress,
			abi: ERC20_ABI,
			functionName: "name",
		})
		return name
	}

	static async getTokenSymbol(
		tokenAddress: Address,
		client: PublicClient,
	): Promise<string> {
		const symbol = await client.readContract({
			address: tokenAddress,
			abi: ERC20_ABI,
			functionName: "symbol",
		})
		return symbol
	}

	async balanceOf(address: Address, client: PublicClient): Promise<bigint> {
		const balance = await client.readContract({
			address: this.address,
			abi: erc20Abi,
			functionName: "balanceOf",
			args: [address],
		})
		return balance
	}

	async allowance(
		address: Address,
		spender: Address,
		client: PublicClient,
	): Promise<bigint> {
		const allowance = await client.readContract({
			address: this.address,
			abi: erc20Abi,
			functionName: "allowance",
			args: [address, spender],
		})
		return allowance
	}
}
