import { Message } from 'node-telegram-bot-api'
import { MessageResponse } from '../../src/core/infrastructure/tg-notifier/types'

export class TgNotifierMock {
	editMessage(
		message: MessageResponse,
		text: string,
	): Promise<Message | undefined> {
		return Promise.resolve({} as Message)
	}
	sendMessage(message: string): Promise<MessageResponse | undefined> {
		return Promise.resolve({} as MessageResponse)
	}
}
