export interface TgNotifierConfig {
	botName: string
}
export interface ArbitrageMessage {
	header: string
	status: string
	opportunity: string
	path: string
}

export interface MessageResponse {
	ok: boolean
	result: {
		message_id: number
		from: {
			id: number
			is_bot: boolean
			first_name: string
			username: string
		}
		chat: {
			id: number
			first_name: string
			username: string
			type: string
		}
		date: number
		text: string
		entities: {
			type: string
			offset: number
			length: number
		}[]
	}
}
