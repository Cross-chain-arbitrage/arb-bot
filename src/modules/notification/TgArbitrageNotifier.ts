import { EdgeWithRate } from '../../graphs/Graph'
import { ArbitragePath } from '../../graphs/path'
import { getPrettyPath } from '../../graphs/visualization'
import { getEnvSafe } from '../../utils/common'
import { TgBaseNotifier } from './TgBaseNotifier'

export class TgArbitrageNotifier extends TgBaseNotifier {
	constructor() {
		const messageThreadId = getEnvSafe('TG_BOT_MESSAGE_THREAD_ID')

		super(messageThreadId)
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
		await this.sendMessage(prettyPath)
	}

	async sendArbitrageEnd(actualAmountOut: string, actualProfitUsd: number) {
		await this.sendMessage(
			`Arbitrage is finished, amount out: ${actualAmountOut}, profit: $${actualProfitUsd}`,
		)
	}

	async sendArbitrageError(error: string) {
		await this.sendMessage(`Arbitrage error: ${error}`)
	}
}
