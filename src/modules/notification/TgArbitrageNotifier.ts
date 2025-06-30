import { getEnvSafe } from '../../utils/common'
import { TgBaseNotifier } from './TgBaseNotifier'

export class TgArbitrageNotifier extends TgBaseNotifier {
	constructor() {
		const messageThreadId = getEnvSafe('TG_BOT_MESSAGE_THREAD_ID')

		super(messageThreadId)
	}

	async sendArbitrageStart(name: string, prettyOpportunity: string) {
		await this.sendMessage(`${name}:\n\n${prettyOpportunity}`)
	}

	async sendArbitrageEnd(
		name: string,
		executionCostInUsd: number,
		actualAmountOut: bigint,
		arbitrageOpportunity: GraphArbitrageOpportunity,
		startTokenPrice: number,
	) {
		const startToken = arbitrageOpportunity.path[0]?.from

		const startAmountFormatted = startToken.formatUnits(
			arbitrageOpportunity.startAmount,
		)
		const actualAmountOutFormatted = startToken.formatUnits(actualAmountOut)
		const expectedAmountOutFormatted = startToken.formatUnits(
			arbitrageOpportunity.endAmount,
		)
		const differenceAmount =
			actualAmountOut - arbitrageOpportunity.startAmount
		const differenceAmountFormatted =
			startToken.formatUnits(differenceAmount)
		const profitPercentage =
			(Number(differenceAmount) /
				Number(arbitrageOpportunity.startAmount)) *
			100
		const revenue = Number(differenceAmountFormatted) * startTokenPrice
		const profitUsd = revenue - executionCostInUsd

		// Calculate expected vs actual comparison
		const expectedProfitAmount =
			arbitrageOpportunity.endAmount - arbitrageOpportunity.startAmount
		const expectedProfitAmountFormatted =
			startToken.formatUnits(expectedProfitAmount)
		const expectedProfitUsd =
			Number(expectedProfitAmountFormatted) * startTokenPrice

		const message =
			`${name}:\n\n` +
			`✅ <b>Arbitrage Completed!</b>\n\n` +
			`Profit USD: $${profitUsd.toFixed(2)}\n\n` +
			`💰 <b>Results</b>\n` +
			`Input: ${startAmountFormatted} ${startToken.toString()}\n` +
			`Output: ${actualAmountOutFormatted} ${startToken.toString()}\n` +
			`Difference: ${differenceAmountFormatted} ${startToken.symbol} (${profitPercentage.toFixed(2)}%)\n` +
			`Revenue: $${revenue.toFixed(2)}\n` +
			`Execution cost: $${executionCostInUsd.toFixed(2)}\n\n` +
			`📊 <b>Expected</b>\n` +
			`Output: ${expectedAmountOutFormatted} ${startToken.symbol} ($${expectedProfitUsd.toFixed(2)})\n` +
			`Profit USD: $${expectedProfitUsd.toFixed(2)}`

		await this.sendMessage(message)
	}

	async sendArbitrageError(
		name: string,
		error: string,
		isLastNotification: boolean,
	) {
		let message = `${name}:\n\n❌<b>Arbitrage error:</b> ${error}`

		if (isLastNotification)
			message +=
				'\n\n⚠️ Too many execution errors in a row, next errors will not be notified'

		await this.sendMessage(message)
	}
}
