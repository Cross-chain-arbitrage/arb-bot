import { GraphVisualizer } from '../../graphs/GraphVisualizer'
import { getEnvSafe } from '../../utils/common'
import { TgBaseNotifier } from './TgBaseNotifier'

export class TgArbitrageNotifier extends TgBaseNotifier {
	// Store message references by opportunity name for editing
	private lastMessage: {
		messageResponse: MessageResponse
		prettyOpportunity: string
	} | null = null

	constructor(readonly graphVisualizer: GraphVisualizer) {
		const messageThreadId = getEnvSafe('TG_BOT_MESSAGE_THREAD_ID')
		super(messageThreadId)
	}

	async sendArbitrageStart(name: string, prettyOpportunity: string) {
		const statusPart = '🔍 <b>Opportunity found, executing...</b>'

		const fullMessage = this.buildMessage(
			name,
			statusPart,
			prettyOpportunity,
		)

		const messageResponse = await this.sendMessage(fullMessage)

		if (messageResponse) {
			this.lastMessage = {
				messageResponse,
				prettyOpportunity,
			}
		}
	}

	async sendArbitrageEnd(
		name: string,
		executionCostInUsd: number,
		actualAmountOut: bigint,
		arbitrageOpportunity: GraphArbitrageOpportunity,
		startTokenPrice: number,
	) {
		// Get the start token from the first edge of the path
		const startToken = arbitrageOpportunity.path[0].from
		const startAmount = arbitrageOpportunity.startAmount

		// Calculate actual revenue and profit using proper token formatting
		const actualAmountOutFormatted = Number(
			startToken.formatUnits(actualAmountOut),
		)
		const startAmountFormatted = Number(startToken.formatUnits(startAmount))
		const actualRevenue =
			(actualAmountOutFormatted - startAmountFormatted) * startTokenPrice
		const actualProfit = actualRevenue - executionCostInUsd

		let statusPart = `✅ <b>Successfully executed!</b>\n\n`
		statusPart += `Profit: $${actualProfit.toFixed(2)}\n`
		statusPart += `Revenue: $${actualRevenue.toFixed(2)}\n`
		statusPart += `Execution Cost: $${executionCostInUsd.toFixed(2)}\n`
		statusPart += `Amount Out: ${actualAmountOutFormatted.toFixed(6)} ${startToken.symbol}`

		await this.editOrSendMessage(
			name,
			statusPart,
			arbitrageOpportunity,
			startTokenPrice,
		)
	}

	async sendArbitrageError(
		name: string,
		error: string,
		isLastNotification: boolean,
		opportunity: GraphArbitrageOpportunity,
		startTokenPrice: number,
	) {
		let statusPart = `❌ <b>Execution error:</b> ${error}`

		if (isLastNotification) {
			statusPart +=
				'\n\n⚠️ Too many execution errors in a row, next errors will not be notified'
		}

		await this.editOrSendMessage(
			name,
			statusPart,
			opportunity,
			startTokenPrice,
		)
	}

	async editOrSendMessage(
		name: string,
		statusPart: string,
		arbitrageOpportunity: GraphArbitrageOpportunity,
		startTokenPrice: number,
	) {
		const prettyOpportunity = this.lastMessage
			? this.lastMessage.prettyOpportunity
			: this.graphVisualizer.getPrettyOpportunity(
					arbitrageOpportunity,
					startTokenPrice,
				)

		const fullMessage = this.buildMessage(
			name,
			statusPart,
			prettyOpportunity,
		)

		try {
			if (this.lastMessage) {
				await this.editMessage(
					this.lastMessage.messageResponse,
					fullMessage,
				)
			} else {
				await this.sendMessage(fullMessage)
			}
		} finally {
			this.lastMessage = null
		}
	}

	private buildMessage(
		botName: string,
		statusPart: string,
		prettyOpportunity: string,
	): string {
		const currentDate = new Date().toLocaleString('ru', {
			timeZoneName: 'short',
		})

		let message = `🤖 <b>${botName}</b>\n`
		message += `🕐 ${currentDate}\n\n`
		message += '━━━━━━━━━━━━━━━━\n\n'
		message += `${statusPart}\n\n`
		message += '━━━━━━━━━━━━━━━━\n\n'
		message += `${prettyOpportunity}`

		return message
	}
}
