import { Inject, Injectable, Logger } from '@nestjs/common'
import { OpportunityNotifier } from '../../../application/interfaces/opportunity-notifier'
import {
	PRICE_ORACLE_TOKEN,
	PriceOracle,
} from '../../../application/interfaces/price-oracle'
import { Token } from '../../../domain/entities/token'
import { ArbitrageOpportunity } from '../../../domain/value-objects/opportunity'
import { ChannelIdUtils } from '../../../domain/services/channel-id-utils'
import { EdgeIdUtils } from '../../../domain/services/edge-id-utils'
import { TgNotifier } from '../tg-notifier'
import { ArbitrageMessage } from './types'

@Injectable()
export class TgOpportunityNotifier implements OpportunityNotifier {
	logger = new Logger(TgOpportunityNotifier.name)

	constructor(
		@Inject(PRICE_ORACLE_TOKEN)
		private readonly priceOracle: PriceOracle,
		private readonly tgNotifier: TgNotifier,
	) {}

	notifyOpportunity(opportunity: ArbitrageOpportunity) {
		this.buildAndSendOpportunity(opportunity).catch((error) => {
			this.logger.error(error, 'Error sending arbitrage start message')
		})
	}

	private async buildAndSendOpportunity(opportunity: ArbitrageOpportunity) {
		const startTokenPrice = await this.priceOracle.getPrice(
			opportunity.quotedStepSequence[0].edge.from,
		)

		const arbitrageMessage: ArbitrageMessage = {
			opportunity: this.buildOpportunity(opportunity, startTokenPrice),
			path: this.buildPath(opportunity),
		}

		const messageToSend = this.buildMessage(arbitrageMessage)

		await this.tgNotifier.sendMessage(messageToSend)
	}

	private buildMessage(arbitrageMessage: ArbitrageMessage) {
		const { opportunity, path } = arbitrageMessage

		const message =
			`${opportunity}\n\n` + `━━━━━━━━━━━━━━━━\n\n` + `${path}`

		return message
	}

	private buildOpportunity(
		opportunity: ArbitrageOpportunity,
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

	private buildPath(opportunity: ArbitrageOpportunity) {
		const { quotedStepSequence } = opportunity

		let result = `🛣️ <b>Path</b>\n\n`

		for (let i = 0; i < quotedStepSequence.length; i++) {
			const step = quotedStepSequence[i]
			const from = step.edge.from as Token
			const { channelId } = EdgeIdUtils.parseId(step.edge.id)
			const { protocol } = ChannelIdUtils.parseId(channelId)

			result += `${from.toString()}\n    │ ${protocol}\n`
		}

		const to = quotedStepSequence[quotedStepSequence.length - 1].edge
			.to as Token
		result += `${to.toString()}`

		return result
	}
}
