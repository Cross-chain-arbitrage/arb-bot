import TelegramBot from 'node-telegram-bot-api'
import { ArbitrageOpportunity } from '../../getArbitrageOpportunities'
import { getEnvSafe } from '../../utils/common'
import { msToTimeIntervalString } from '../../utils/time'
import { TgBaseNotifier } from './TgBaseNotifier'

export class TgOpportunityNotifier extends TgBaseNotifier {
	constructor() {
		const botToken = getEnvSafe('TG_BOT_TOKEN')
		const userIdsToNotify = getEnvSafe('TG_USER_IDS_TO_NOTIFY')

		super(botToken, userIdsToNotify)
	}

	async sendNotificationsOnOpportunity(
		opportunity: ArbitrageOpportunity,
		inception: Date,
	): Promise<(MessageResponse | undefined)[]> {
		const message = this.getMessage(opportunity, inception)

		return Promise.all(
			this.TG_USER_IDS_TO_NOTIFY.map((userId) =>
				this.sendMessage(userId, message),
			),
		)
	}

	async editNotificationsOnOpportunity(
		opportunity: ArbitrageOpportunity,
		inception: Date,
		messages: MessageResponse[],
	): Promise<(TelegramBot.Message | undefined)[]> {
		const updatedMessage = this.getMessage(opportunity, inception)

		return Promise.all(
			messages.map((message) =>
				this.editMessage(message, updatedMessage),
			),
		)
	}

	getMessage(
		opportunity: ArbitrageOpportunity,
		inception: Date,
		isUpdate: boolean = false,
	): string {
		const { pool } = opportunity
		const pair = `${opportunity.token0Symbol}/${opportunity.token1Symbol}`

		let message =
			`🔄 <b>Arbitrage ${pair} on ${pool.chainName}!</b> 🔄\n\n` +
			`Pool: ${pool.address} (${pool.type})\n` +
			`Chain: ${pool.chainName}\n` +
			`Tokens: ${pair}\n\n` +
			`👀 <b>Price Lookup</b> 👀\n` +
			`Expected Price: ${opportunity.expectedPrice.toFixed(8)}\n` +
			`Actual Price: ${opportunity.actualPrice.toFixed(8)}\n` +
			`Price Difference: ${opportunity.priceDiffPercent.toFixed(2)}%\n`

		if (opportunity.potentialProfit) {
			message +=
				`\n💰 <b>Potential Profit</b> 💰\n` +
				`Input: ${opportunity.potentialProfit.tokenIn.formatUnits(opportunity.potentialProfit.amountIn)} ${opportunity.potentialProfit.tokenIn.symbol} ($${opportunity.potentialProfit.amountInUSD.toFixed(2)})\n` +
				`Output: ${opportunity.potentialProfit.tokenOut.formatUnits(opportunity.potentialProfit.amountOut)} ${opportunity.potentialProfit.tokenOut.symbol} ($${opportunity.potentialProfit.amountOutUSD.toFixed(2)})\n` +
				`Profit: $${opportunity.potentialProfit.profitUSD.toFixed(2)} USD`
		}

		const lifetimeMs = new Date().getTime() - inception.getTime()

		const lifetimeMessage =
			lifetimeMs === 0 ? 'Just now' : msToTimeIntervalString(lifetimeMs)

		message += `\n\n⏳ Lifetime: ${lifetimeMessage}`

		if (isUpdate)
			message += `\nLast update time: ${new Date().toISOString()}`

		return message
	}
}
