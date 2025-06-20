import { getEnvSafe } from '../../utils/common'
import { TgBaseNotifier } from './TgBaseNotifier'

export class TgArbitrageNotifier extends TgBaseNotifier {
	constructor() {
		const messageThreadId = getEnvSafe('TG_BOT_MESSAGE_THREAD_ID')

		super(messageThreadId)
	}

	async sendArbitrageStart(
		name: string,
		path: GraphArbitrageOpportunity,
		startTokenPrice: number,
	) {
		// TODO: implement pretty path
		await this.sendMessage(`${name}: start arbitrage`)
	}

	async sendArbitrageEnd(
		name: string,
		actualAmountOut: string,
		actualProfitUsd: number,
	) {
		await this.sendMessage(
			`${name}:\nArbitrage is finished, amount out: ${actualAmountOut}, profit: $${actualProfitUsd}`,
		)
	}

	async sendArbitrageError(name: string, error: string) {
		await this.sendMessage(`${name}:\nArbitrage error: ${error}`)
	}
}
