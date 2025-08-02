import { Logger } from '@nestjs/common'
import { ChainClientService } from '../chain-client/chain-client.service'
import { TgBalancesNotifier } from '../modules/notification/TgBalancesNotifier'
import { PriceOracleService } from '../modules/price-oracle/price-oracle.service'
import { getAccountAddress } from '../utils/common'
import { GraphArbitrageBot } from './GraphArbitrageBot'

interface NodeWithBalance {
	node: GraphNode
	balance: bigint
	usdValue: number
}

export class GraphBalanceReporter {
	addressToCheck: Address
	private isRunning = false
	private intervalId: NodeJS.Timeout | null = null
	private readonly updateInterval: number

	constructor(
		readonly bot: GraphArbitrageBot,
		readonly tgNotifier: TgBalancesNotifier,
		readonly chainClientService: ChainClientService,
		readonly priceOracleService: PriceOracleService,
		private readonly logger: Logger,
		updateInterval: number = 60000, // 60 seconds default
	) {
		this.addressToCheck = getAccountAddress()
		this.updateInterval = updateInterval
	}

	/**
	 * Start periodic balance checking
	 */
	start() {
		if (this.isRunning) {
			this.logger.warn('GraphBalanceReporter is already running')
			return
		}

		this.isRunning = true
		this.logger.log(
			`Starting periodic balance reporter (interval: ${this.updateInterval}ms)`,
		)

		// Initial balance check
		this.reportBalances().catch((error) =>
			this.logger.error('Error in initial balance check:', error),
		)

		// Set up periodic checking
		this.intervalId = setInterval(() => {
			this.reportBalances().catch((error) =>
				this.logger.error('Error in periodic balance check:', error),
			)
		}, this.updateInterval)
	}

	/**
	 * Stop periodic balance checking
	 */
	stop() {
		if (!this.isRunning) {
			return
		}

		this.isRunning = false
		if (this.intervalId) {
			clearInterval(this.intervalId)
			this.intervalId = null
		}
		this.logger.log('Stopped periodic balance reporter')
	}

	async reportBalances() {
		try {
			const balances = await this.getBalances()
			const balancesByChain = this.groupBalancesByChain(balances)

			const message = this.buildBalanceReport(balancesByChain)

			this.logger.log(message)

			await this.tgNotifier.sendOrEditBalanceReport(
				message,
				this.bot.botName,
			)
		} catch (error) {
			this.logger.error('Failed to report balances:', error)
		}
	}

	private async getBalances() {
		const nodesAndBalancesPromises: Promise<NodeWithBalance>[] = []

		for (const [, node] of this.bot.graphParams.graph.nodes) {
			nodesAndBalancesPromises.push(this.getNodeBalanceAndPrice(node))
		}

		const nodesAndBalances = await Promise.all(nodesAndBalancesPromises)
		return nodesAndBalances.filter((item) => item.balance > 0n) // Only show non-zero balances
	}

	private async getNodeBalanceAndPrice(node: GraphNode) {
		const [balance, price] = await Promise.all([
			node.balanceOf(this.addressToCheck),
			this.priceOracleService.getPrice(node).catch(() => 0), // Fallback to 0 if price not available
		])

		const balanceFormatted = Number(node.formatUnits(balance))
		const usdValue = balanceFormatted * price

		return { node, balance, usdValue }
	}

	private groupBalancesByChain(balances: Array<NodeWithBalance>) {
		const balancesByChain = new Map<number, Array<NodeWithBalance>>()

		for (const item of balances) {
			const chainId = item.node.chainId
			if (!balancesByChain.has(chainId)) {
				balancesByChain.set(chainId, [])
			}
			balancesByChain.get(chainId)!.push(item)
		}

		return balancesByChain
	}

	private buildBalanceReport(
		balancesByChain: Map<number, Array<NodeWithBalance>>,
	) {
		let totalUsd = 0

		// Calculate total USD value
		for (const chainBalances of balancesByChain.values()) {
			totalUsd += chainBalances.reduce(
				(sum, item) => sum + item.usdValue,
				0,
			)
		}

		// Build unified message
		let message =
			`<b>${this.bot.botName}</b>\n` +
			`🕐 ${new Date().toLocaleString('ru', { timeZoneName: 'short' })}\n` +
			`💵 <b>Total Portfolio: $${totalUsd.toFixed(2)}</b>\n\n`

		for (const [chainId, chainBalances] of balancesByChain) {
			const chainName = this.chainClientService.getChainNameById(chainId)
			const chainTotal = chainBalances.reduce(
				(sum, item) => sum + item.usdValue,
				0,
			)

			message += `🔗 <b>${chainName}</b> - $${chainTotal.toFixed(2)}\n`

			// Sort tokens: native currencies first, then others in original order
			const nativeTokens = chainBalances.filter((item) =>
				item.node.isNative(),
			)
			const nonNativeTokens = chainBalances.filter(
				(item) => !item.node.isNative(),
			)
			const sortedTokens = [...nativeTokens, ...nonNativeTokens]

			for (const { node, balance, usdValue } of sortedTokens) {
				const balanceFormatted = node.formatUnits(balance)
				const isNative = node.isNative()

				// Color coding for native currencies based on USD value
				let colorEmoji = ''
				if (isNative) {
					if (usdValue < 0.5) {
						colorEmoji = '🔴' // Red
					} else if (usdValue < 1.5) {
						colorEmoji = '🟡' // Yellow
					} else {
						colorEmoji = '🟢' // Green
					}
				}

				const nativeLabel = isNative ? `${colorEmoji}` : ''
				message += `  ${node.symbol}: ${Number(balanceFormatted).toFixed(4)} ($${usdValue.toFixed(2)}) ${nativeLabel}\n`
			}

			message += '\n'
		}

		return message
	}

	async getCurrentBalances() {
		const balances = await this.getBalances()
		return this.groupBalancesByChain(balances)
	}
}
