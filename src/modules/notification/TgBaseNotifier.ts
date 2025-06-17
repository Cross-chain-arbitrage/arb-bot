import TelegramBot from 'node-telegram-bot-api'
import { getEnvSafe } from '../../utils/common'

export class TgBaseNotifierError extends Error {
	constructor(
		message: string,
		public readonly response: Response,
	) {
		super(message)
		Object.setPrototypeOf(this, TgBaseNotifierError.prototype)
		this.name = 'TelegramAPIError'
	}
}

export class TgBaseNotifier {
	protected BOT_TOKEN: string
	protected TG_USER_ID: string
	protected TG_MESSAGE_THREAD_ID: string
	protected bot: TelegramBot

	constructor(messageThreadId: string) {
		this.BOT_TOKEN = getEnvSafe('TG_BOT_TOKEN')
		this.TG_USER_ID = getEnvSafe('TG_USER_ID')
		this.TG_MESSAGE_THREAD_ID = messageThreadId

		this.bot = new TelegramBot(this.BOT_TOKEN)
	}

	async sendMessage(message: string): Promise<MessageResponse | undefined> {
		try {
			const response = await fetch(
				`https://api.telegram.org/bot${this.BOT_TOKEN}/sendMessage`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						chat_id: this.TG_USER_ID,
						message_thread_id: this.TG_MESSAGE_THREAD_ID,
						text: message,
						parse_mode: 'HTML',
					}),
				},
			)

			if (!response.ok) {
				throw new TgBaseNotifierError(
					`HTTP error! status: ${response.status}`,
					response,
				)
			}

			const responseJson = await response.json()
			return responseJson as MessageResponse
		} catch (error) {
			console.error(
				`Failed to send message to user ${this.TG_USER_ID}:`,
				error,
			)
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
			if (error instanceof TgBaseNotifierError) {
				console.error(
					`Failed to edit message ${message.result.message_id}:`,
					error.response.status,
					(await error.response.json()).description,
				)
			}
		}
	}
}
