import TelegramBot from 'node-telegram-bot-api'
import { ArbitrageOpportunity } from '../getArbitrageOpportunities'
import { msToTimeIntervalString } from '../utils/time'

export class TgNotificationServiceError extends Error {
	constructor(
		message: string,
		public readonly response: Response,
	) {
		super(message)
		Object.setPrototypeOf(this, TgNotificationServiceError.prototype)
		this.name = 'TelegramAPIError'
	}
}

export class TgNotificationService {
	private BOT_TOKEN = this.getBotToken()
	private TG_USER_IDS_TO_NOTIFY = this.getUserIDsToNotify()
	private bot: TelegramBot

	constructor() {
		this.bot = new TelegramBot(this.BOT_TOKEN)
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

	async sendMessage(
		userId: number,
		message: string,
	): Promise<MessageResponse | undefined> {
		try {
			const response = await fetch(
				`https://api.telegram.org/bot${this.BOT_TOKEN}/sendMessage`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						chat_id: userId,
						text: message,
						parse_mode: 'HTML',
					}),
				},
			)

			if (!response.ok) {
				throw new TgNotificationServiceError(
					`HTTP error! status: ${response.status}`,
					response,
				)
			}

			const responseJson = await response.json()
			return responseJson as MessageResponse
		} catch (error) {
			console.error(`Failed to send message to user ${userId}:`, error)
		}
	}

	async editMessage(
		message: MessageResponse,
		text: string,
	): Promise<TelegramBot.Message | undefined> {
		try {
			const response = await this.bot.editMessageText(text, {
				chat_id: message.result.chat.id,
				message_id: message.result.message_id,
				parse_mode: 'HTML',
			})

			return response as TelegramBot.Message
		} catch (error) {
			if (error instanceof TgNotificationServiceError) {
				console.error(
					`Failed to edit message ${message.result.message_id}:`,
					error.response.status,
					(await error.response.json()).description,
				)
			}
		}
	}

	getBotToken(): string {
		const token = process.env.TG_BOT_TOKEN
		if (!token) {
			throw new Error('TG_BOT_TOKEN is not set')
		}
		return token
	}

	getUserIDsToNotify(): number[] {
		const ids = process.env.TG_USER_IDS_TO_NOTIFY
		if (!ids) {
			throw new Error('TG_USER_IDS_TO_NOTIFY is not set')
		}
		return ids.split(',').map(Number)
	}
}
