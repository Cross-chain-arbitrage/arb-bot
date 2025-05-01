import { Address, PublicClient } from "viem"
import { ERC20_ABI } from "../abi/erc20"

export class Token {
	constructor(
		public address: Address,
		public decimals: number,
		public name: string,
		public symbol: string,
		public chainId?: number,
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

		return new Token(address, decimals, name, symbol, chainId)
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
}
