import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getEnvSafe, wait } from '../../../utils/common'
import { ArbitrageNotifier } from '../../application/interfaces/arbitrage-notifier'
import {
	PRICE_ORACLE_TOKEN,
	PriceOracle,
} from '../../application/interfaces/price-oracle'
import {
	FailedPathExecutionResult,
	PathExecutionResult,
	SuccessPathExecutionResult,
} from '../../application/use-cases/execution/path-executor/types'
import { GraphArbitrageOpportunity } from '../../application/use-cases/finding/snapshot-opportunity-finder/types'
import { Token } from '../../domain/entities/token'
import { ChannelIdUtils } from '../../domain/services/channel-id-utils'
import { EdgeIdUtils } from '../../domain/services/edge-id-utils'
import { TgNotifier } from './tg-notifier'
import { ArbitrageMessage } from './types'

@Injectable()
export class TgArbitrageNotifier
	extends TgNotifier
	implements ArbitrageNotifier
{
	logger = new Logger(TgArbitrageNotifier.name)
	private lastMessages: Map<
		string,
		{
			messageResponse: MessageResponse
			message: ArbitrageMessage
		}
	> = new Map()

	constructor(
		@Inject(PRICE_ORACLE_TOKEN)
		private readonly priceOracle: PriceOracle,
		private readonly configService: ConfigService,
	) {
		const messageThreadId = getEnvSafe('TG_BOT_MESSAGE_THREAD_ID')
		super(messageThreadId)
	}

	notifyArbitrageStart(opportunity: GraphArbitrageOpportunity) {
		this.buildAndSendArbitrageStart(opportunity).catch((error) => {
			this.logger.error(error, 'Error sending arbitrage start message')
		})
	}

	notifyArbitrageEnd(
		opportunity: GraphArbitrageOpportunity,
		result: PathExecutionResult,
	): void {
		this.buildAndSendArbitrageEnd(opportunity, result).catch((error) => {
			this.logger.error(error, 'Error sending arbitrage end message')
		})
	}

	private async buildAndSendArbitrageStart(
		opportunity: GraphArbitrageOpportunity,
	) {
		const status = '🔍 <b>Opportunity found, executing...</b>'

		const startTokenPrice = await this.priceOracle.getPrice(
			opportunity.startToken,
		)

		const arbitrageMessage: ArbitrageMessage = {
			header: this.buildHeader(),
			status,
			opportunity: this.buildOpportunity(opportunity, startTokenPrice),
			path: this.buildPath(opportunity),
		}

		const messageToSend = this.buildMessage(arbitrageMessage)

		const messageResponse = await this.sendMessage(messageToSend)

		if (messageResponse) {
			this.lastMessages.set(opportunity.id, {
				messageResponse,
				message: arbitrageMessage,
			})
		}
	}

	private async buildAndSendArbitrageEnd(
		opportunity: GraphArbitrageOpportunity,
		result: PathExecutionResult,
	) {
		const resultStatus = result.status
		const status =
			resultStatus === 'success'
				? await this.buildSuccessStatus(opportunity, result)
				: this.buildFailedStatus(result)

		const startTokenPrice = await this.priceOracle.getPrice(
			opportunity.startToken,
		)

		const arbitrageMessage: ArbitrageMessage = {
			header: this.buildHeader(),
			status,
			opportunity: this.buildOpportunity(opportunity, startTokenPrice),
			path: this.buildPath(opportunity, result),
		}
		await this.editOrSendMessage(opportunity, arbitrageMessage)
	}

	private async buildSuccessStatus(
		opportunity: GraphArbitrageOpportunity,
		result: SuccessPathExecutionResult,
	) {
		const { actualEndAmount, totalExecutionCostInUsd } = result

		const actualAmountOutFormatted = Number(
			opportunity.startToken.formatUnits(actualEndAmount),
		)
		const startAmountFormatted = Number(
			opportunity.startToken.formatUnits(opportunity.startAmount),
		)
		const startTokenPrice = await this.priceOracle.getPrice(
			opportunity.startToken,
		)
		const actualRevenue =
			(actualAmountOutFormatted - startAmountFormatted) * startTokenPrice
		const actualProfit = actualRevenue - totalExecutionCostInUsd

		let statusPart = `✅ <b>Successfully executed!</b>\n\n`
		statusPart += `Profit: $${actualProfit.toFixed(2)}\n`
		statusPart += `Cost: $${totalExecutionCostInUsd.toFixed(2)}\n`
		statusPart += `Amount Out: ${actualAmountOutFormatted.toFixed(6)} ${opportunity.startToken.symbol}`

		return statusPart
	}

	private buildFailedStatus(result: FailedPathExecutionResult) {
		const { reason } = result
		let status = '❌ <b>Execution error</b>\n\n'
		status += `Reason: ${reason}\n\n`
		status += `Cost: $${result.totalExecutionCostInUsd.toFixed(2)}`

		return status
	}

	async editOrSendMessage(
		arbitrageOpportunity: GraphArbitrageOpportunity,
		arbitrageMessage: ArbitrageMessage,
	) {
		const fullMessage = this.buildMessage(arbitrageMessage)

		let lastMessage = this.lastMessages.get(arbitrageOpportunity.id)

		// if initial message recently sent, wait for it to be edited
		if (!lastMessage) await wait(1000)

		lastMessage = this.lastMessages.get(arbitrageOpportunity.id)

		try {
			if (lastMessage) {
				await this.editMessage(lastMessage.messageResponse, fullMessage)
			} else {
				await this.sendMessage(fullMessage)
			}
		} finally {
			this.lastMessages.delete(arbitrageOpportunity.id)
		}
	}

	private buildHeader() {
		const currentDate = new Date().toLocaleString('ru', {
			timeZoneName: 'short',
		})

		const botName =
			this.configService.get<string>('botName') ?? 'Unknown bot'

		const message = `🤖 <b>${botName}</b>\n` + `🕐 ${currentDate}`

		return message
	}

	private buildMessage(arbitrageMessage: ArbitrageMessage) {
		const { header, status, opportunity, path } = arbitrageMessage

		const message =
			`${header}\n\n` +
			`━━━━━━━━━━━━━━━━\n\n` +
			`${status}\n\n` +
			`━━━━━━━━━━━━━━━━\n\n` +
			`${opportunity}\n\n` +
			`━━━━━━━━━━━━━━━━\n\n` +
			`${path}`

		return message
	}

	private buildOpportunity(
		opportunity: GraphArbitrageOpportunity,
		startTokenPriceUsd: number,
	) {
		const { costInUsd, revenueInUsd, startAmount, endAmount, startToken } =
			opportunity

		// Get the start token from the first edge
		// Format amounts
		const startAmountFormatted = startToken.formatUnits(startAmount)
		const endAmountFormatted = startToken.formatUnits(endAmount)
		const revenueAmountFormatted = startToken.formatUnits(
			endAmount - startAmount,
		)

		const startUsd = Number(startAmountFormatted) * startTokenPriceUsd
		const endUsd = Number(endAmountFormatted) * startTokenPriceUsd

		let result = `👀 <b>Opportunity</b>\n\n`

		result += `Profit: $${(revenueInUsd - costInUsd).toFixed(2)}\n`
		result += `Cost: $${costInUsd.toFixed(2)}\n\n`

		result += `Revenue: ${revenueAmountFormatted} ${startToken.symbol}\n`
		result += `Start: $${startUsd.toFixed(2)} ${startAmountFormatted} ${startToken.toString()}\n`
		result += `End: $${endUsd.toFixed(2)} ${endAmountFormatted} ${startToken.toString()}`

		return result
	}

	private buildPath(
		opportunity: GraphArbitrageOpportunity,
		pathResult?: PathExecutionResult,
	) {
		const { path } = opportunity

		let result = `🛣️ <b>Path</b>\n\n`

		for (let i = 0; i < path.length; i++) {
			const step = path[i]
			const from = step.edge.from as Token
			const { channelId } = EdgeIdUtils.parseId(step.edge.id)
			const { protocol } = ChannelIdUtils.parseId(channelId)

			let stepResult = ''

			if (
				pathResult &&
				pathResult.status === 'failed' &&
				pathResult.step.edge.id === step.edge.id
			) {
				stepResult = `❌`
			}
			result += `${from.toString()}\n    │${stepResult} ${protocol}\n`
		}

		const to = path[path.length - 1].edge.to as Token
		result += `${to.toString()}`

		return result
	}
}
