import { ArbitragePath } from '../../graphs/path'
import { EdgeWithRate, getPrettyPath } from '../../graphs/visualization'
import { getEnvSafe } from '../../utils/common'
import { TgBase } from './TgBase'

export class TgArbitrage extends TgBase {
	constructor() {
		const botToken = getEnvSafe('TG_ARBITRAGE_BOT_TOKEN')
		const userIdsToNotify = getEnvSafe('TG_ARBITRAGE_USER_IDS_TO_NOTIFY')

		super(botToken, userIdsToNotify)
	}

	async sendArbitrageStart(
		path: ArbitragePath,
		edgesWithRate: Map<string, EdgeWithRate>,
		startTokenPrice: number,
	) {
		const prettyPath = await getPrettyPath(
			path,
			edgesWithRate,
			startTokenPrice,
		)
		await this.sendMessageToAll(prettyPath)
	}

	async sendArbitrageEnd(actualAmountOut: string, actualProfitUsd: number) {
		await this.sendMessageToAll(
			`Arbitrage is finished, amount out: ${actualAmountOut}, profit: $${actualProfitUsd}`,
		)
	}

	async sendArbitrageError(error: string) {
		await this.sendMessageToAll(`Arbitrage error: ${error}`)
	}
}
