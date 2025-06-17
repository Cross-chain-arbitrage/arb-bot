import TelegramBot from 'node-telegram-bot-api'

export class TgBaseError extends Error {
	constructor(
		message: string,
		public readonly response: Response,
	) {
		super(message)
		Object.setPrototypeOf(this, TgBaseError.prototype)
		this.name = 'TelegramAPIError'
	}
}

export class TgBase {
	protected BOT_TOKEN: string
	protected TG_USER_IDS_TO_NOTIFY: number[]
	protected bot: TelegramBot

	constructor(botToken: string, userIdsToNotify: string) {
		this.BOT_TOKEN = botToken

		this.TG_USER_IDS_TO_NOTIFY = userIdsToNotify.split(',').map(Number)

		this.bot = new TelegramBot(this.BOT_TOKEN)
	}

	async sendMessageToAll(message: string) {
		for (const userId of this.TG_USER_IDS_TO_NOTIFY) {
			await this.sendMessage(userId, message)
		}
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
				throw new TgBaseError(
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
			if (error instanceof TgBaseError) {
				console.error(
					`Failed to edit message ${message.result.message_id}:`,
					error.response.status,
					(await error.response.json()).description,
				)
			}
		}
	}
}
