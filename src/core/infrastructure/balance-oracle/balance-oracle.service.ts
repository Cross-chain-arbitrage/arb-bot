import { Inject, Injectable } from '@nestjs/common'
import {
	BalanceOracle,
	NodeWithBalance,
} from '../../application/interfaces/balance-oracle'
import {
	PRICE_ORACLE_TOKEN,
	PriceOracle,
} from '../../application/interfaces/price-oracle'
import { Node } from '../../domain/entities/node'
import { ChainClientService } from '../evm/chain-client/chain-client.service'
import { NativeCurrency } from '../evm/primitives/tokens/NativeCurrency'
import { Token } from '../evm/primitives/tokens/Token'
import { SolanaClientService } from '../solana/solana-client.service'
import { SolanaNative } from '../solana/solana-tokens/solana-native'
import { SolanaToken } from '../solana/solana-tokens/solana-token'

@Injectable()
export class BalanceOracleService implements BalanceOracle {
	constructor(
		private readonly chainClientService: ChainClientService,
		private readonly solanaClientService: SolanaClientService,
		@Inject(PRICE_ORACLE_TOKEN) private readonly priceOracle: PriceOracle,
	) {}

	async getBalances(nodes: Node[]): Promise<NodeWithBalance[]> {
		const nodesAndBalancesPromises: Promise<NodeWithBalance>[] = []

		for (const node of nodes) {
			nodesAndBalancesPromises.push(this.getNodeWithBalance(node))
		}

		const nodesAndBalances = await Promise.all(nodesAndBalancesPromises)
		return nodesAndBalances.filter((item) => item.balance > 0n) // Only show non-zero balances
	}

	private async getNodeWithBalance(node: Node): Promise<NodeWithBalance> {
		switch (true) {
			case node instanceof Token:
				return this.getEvmNodeWithBalance(node)
			case node instanceof NativeCurrency:
				return this.getEvmNodeWithBalance(node)
			case node instanceof SolanaToken:
				return this.getSolanaNodeWithBalance(node)
			case node instanceof SolanaNative:
				return this.getSolanaNodeWithBalance(node)
			default:
				throw new Error(
					`Unsupported node type: ${node.constructor.name}`,
				)
		}
	}

	private async getSolanaNodeWithBalance(
		node: SolanaToken | SolanaNative,
	): Promise<NodeWithBalance> {
		const addressToCheck = this.solanaClientService.walletAddress

		const [balance, price] = await Promise.all([
			node.balanceOf(addressToCheck),
			this.priceOracle.getPrice(node),
		])

		const balanceFormatted = Number(node.formatUnits(balance))
		const usdValue = balanceFormatted * price

		return { node, balance, usdValue, isNative: node.isNative() }
	}

	private async getEvmNodeWithBalance(
		node: Token | NativeCurrency,
	): Promise<NodeWithBalance> {
		const addressToCheck = this.chainClientService.getWalletClient(
			node.chainId,
		).account.address

		const [balance, price] = await Promise.all([
			node.balanceOf(addressToCheck),
			this.priceOracle.getPrice(node),
		])

		const balanceFormatted = Number(node.formatUnits(balance))
		const usdValue = balanceFormatted * price

		return { node, balance, usdValue, isNative: node.isNative() }
	}
}
