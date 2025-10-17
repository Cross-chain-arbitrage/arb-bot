import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { wait } from '../../../../utils/common'
import { ArbitrageNotifier } from '../../../application/interfaces/arbitrage-notifier'
import {
	PRICE_ORACLE_TOKEN,
	PriceOracle,
} from '../../../application/interfaces/price-oracle'
import {
	ArbitrageResult,
	FailedArbitrageResult,
	SuccessArbitrageResult,
} from '../../../application/use-cases/execution/arbitrage-executor/types'
import { PathExecutionResult } from '../../../application/use-cases/execution/path-executor/types'
import { GraphArbitrageOpportunity } from '../../../application/use-cases/finding/snapshot-opportunity-finder/types'
import { Token } from '../../../domain/entities/token'
import { ChannelIdUtils } from '../../../domain/services/channel-id-utils'
import { EdgeIdUtils } from '../../../domain/services/edge-id-utils'
import { TgNotifier } from '../tg-notifier'
import { MessageResponse } from '../types'
import { ArbitrageMessage } from './types'

const MAX_ERROR_IN_ROW = 3
type OpportunityId = string

@Injectable()
export class TgArbitrageNotifier implements ArbitrageNotifier {
	logger = new Logger(TgArbitrageNotifier.name)

	private errorInRow = 0
	private lastMessages: Map<
		OpportunityId,
		{
			messageResponse: MessageResponse
			message: ArbitrageMessage
		}
	> = new Map()

	constructor(
		@Inject(PRICE_ORACLE_TOKEN)
		private readonly priceOracle: PriceOracle,
		private readonly configService: ConfigService,
		private readonly tgNotifier: TgNotifier,
	) {}

	notifyArbitrageStart(opportunity: GraphArbitrageOpportunity) {
		this.buildAndSendArbitrageStart(opportunity).catch((error) => {
			this.logger.error(error, 'Error sending arbitrage start message')
		})
	}

	notifyArbitrageEnd(
		opportunity: GraphArbitrageOpportunity,
		result: ArbitrageResult,
	): void {
		this.buildAndSendArbitrageEnd(opportunity, result).catch((error) => {
			this.logger.error(error, 'Error sending arbitrage end message')
		})
	}

	private async buildAndSendArbitrageStart(
		opportunity: GraphArbitrageOpportunity,
	) {
		if (this.errorInRow > MAX_ERROR_IN_ROW - 1) return

		const status = '🔍 <b>Opportunity found, executing...</b>'

		const startTokenPrice = await this.priceOracle.getPrice(
			opportunity.quotedStepSequence[0].edge.from,
		)

		const arbitrageMessage: ArbitrageMessage = {
			header: this.buildHeader(),
			status,
			opportunity: this.buildOpportunity(opportunity, startTokenPrice),
			path: this.buildPath(opportunity),
		}

		const messageToSend = this.buildMessage(arbitrageMessage)

		const messageResponse = await this.tgNotifier.sendMessage(messageToSend)

		if (messageResponse) {
			this.lastMessages.set(opportunity.id, {
				messageResponse,
				message: arbitrageMessage,
			})
		}
	}

	private async buildAndSendArbitrageEnd(
		opportunity: GraphArbitrageOpportunity,
		result: ArbitrageResult,
	) {
		if (result.status === 'failed') this.errorInRow++
		else this.errorInRow = 0

		if (this.errorInRow > MAX_ERROR_IN_ROW) return

		const resultStatus = result.status
		const status =
			resultStatus === 'success'
				? this.buildSuccessStatus(opportunity, result)
				: this.buildFailedStatus(result)

		const startTokenPrice = await this.priceOracle.getPrice(
			opportunity.quotedStepSequence[0].edge.from,
		)

		const arbitrageMessage: ArbitrageMessage = {
			header: this.buildHeader(),
			status,
			opportunity: this.buildOpportunity(opportunity, startTokenPrice),
			path: this.buildPath(opportunity, result.pathExecutionResult),
		}
		await this.editOrSendMessage(opportunity, arbitrageMessage)
	}

	private buildSuccessStatus(
		opportunity: GraphArbitrageOpportunity,
		result: SuccessArbitrageResult,
	) {
		const { pathExecutionResult, profitInUsd } = result
		const { actualEndAmount, totalExecutionCostInUsd } = pathExecutionResult

		const actualAmountOutFormatted = Number(
			opportunity.quotedStepSequence[0].edge.from.formatUnits(
				actualEndAmount,
			),
		)

		const startToken = opportunity.quotedStepSequence[0].edge.from

		let statusPart = `✅ <b>Successfully executed!</b>\n\n`
		statusPart += `Profit: $${profitInUsd.toFixed(2)}\n`
		statusPart += `Cost: $${totalExecutionCostInUsd.toFixed(2)}\n`
		statusPart += `Amount Out: ${actualAmountOutFormatted.toFixed(6)} ${startToken.symbol}\n`
		statusPart += `Execution Time: ${this.formatTime(result.executionTime)}`

		return statusPart
	}

	private buildFailedStatus(result: FailedArbitrageResult) {
		const { recoveryResult, pathExecutionResult } = result

		//tg allows to send up to ~4000 symbols
		const MAX_REASON_LENGTH = 2000
		const reasonToSend =
			pathExecutionResult.reason.length > MAX_REASON_LENGTH
				? pathExecutionResult.reason.slice(0, MAX_REASON_LENGTH) + '...'
				: pathExecutionResult.reason

		let status = '❌ <b>Execution error</b>\n\n'

		let cost = pathExecutionResult.totalExecutionCostInUsd
		if (recoveryResult.status === 'success') {
			status += 'Recovery successful\n\n'
			cost = recoveryResult.pathExecutionResult.totalExecutionCostInUsd
		} else status += 'Recovery failed\n\n'

		if (this.errorInRow === MAX_ERROR_IN_ROW)
			status += `⚠️ Max errors in a row reached (${MAX_ERROR_IN_ROW}), next messages will not be sent until successful execution \n\n`
		status += `Reason: ${reasonToSend}\n\n`
		status += `Cost: $${cost.toFixed(2)}\n`
		status += `Execution Time: ${this.formatTime(result.executionTime)}`

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
				await this.tgNotifier.editMessage(
					lastMessage.messageResponse,
					fullMessage,
				)
			} else {
				await this.tgNotifier.sendMessage(fullMessage)
			}
		} finally {
			this.lastMessages.delete(arbitrageOpportunity.id)
		}
	}

	private formatTime(ms: number): string {
		const mins = Math.floor(ms / 60000)
		const secs = Math.floor((ms % 60000) / 1000)
		const milliseconds = ms % 1000

		return `${mins}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
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
		const { costInUsd, revenueInUsd, startAmount, endAmount } = opportunity

		const startToken = opportunity.quotedStepSequence[0].edge.from

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
		const { quotedStepSequence } = opportunity

		let result = `🛣️ <b>Path</b>\n\n`

		for (let i = 0; i < quotedStepSequence.length; i++) {
			const step = quotedStepSequence[i]
			const from = step.edge.from as Token
			const { channelId } = EdgeIdUtils.parseId(step.edge.id)
			const { protocol } = ChannelIdUtils.parseId(channelId)

			let stepResult = ''

			if (
				pathResult &&
				pathResult.status === 'failed' &&
				pathResult.stepIndex === i
			) {
				stepResult = `❌`
			}
			result += `${from.toString()}\n    │${stepResult} ${protocol}\n`
		}

		const to = quotedStepSequence[quotedStepSequence.length - 1].edge
			.to as Token
		result += `${to.toString()}`

		return result
	}
}
