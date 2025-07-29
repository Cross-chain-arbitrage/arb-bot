import { Injectable, Logger } from '@nestjs/common'
import { getEnvSafe } from '../../utils/common'
import { TgBaseNotifier } from './TgBaseNotifier'

@Injectable()
export class TgBalancesNotifier extends TgBaseNotifier {
	// Store message references by bot name for editing
	private messageStore = new Map<string, MessageResponse>()

	constructor(private readonly logger: Logger) {
		const messageThreadId = getEnvSafe('TG_BALANCE_REPORTER_THREAD_ID')

		super(messageThreadId)
	}

	async sendOrEditBalanceReport(message: string, botName: string) {
		try {
			await this._sendOrEditBalanceReport(message, botName)
		} catch (error) {
			this.logger.error(`Failed to send/edit balance message`, error)
		}
	}

	private async _sendOrEditBalanceReport(message: string, botName: string) {
		const existingMessage = this.messageStore.get(botName)

		if (existingMessage) {
			// Try to edit existing message
			try {
				await this.editMessage(existingMessage, message)
			} catch (error) {
				this.logger.warn(
					`Failed to edit message, sending new one:`,
					error,
				)

				// If edit fails, send new message and update store
				const newMessage = await this.sendMessage(message)
				if (newMessage) {
					this.messageStore.set(botName, newMessage)
				}
			}
		} else {
			// Send new message
			const newMessage = await this.sendMessage(message)

			if (newMessage) {
				this.messageStore.set(botName, newMessage)
			}
		}
	}
}
