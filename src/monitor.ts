import {
	ArbitrageOpportunity,
	getArbitrageOpportunities,
} from './getArbitrageOpportunities'
import { TgNotificationService } from './notification/TgNotificationService'
import { runFuncWithDelay } from './utils/polling'

const MIN_DIFFERENCE_TO_NOTIFY = 2
const MIN_PROFIT_TO_NOTIFY = 5

const POLL_INTERVAL_MS = 5 * 60 * 1000

const NotificationService = new TgNotificationService()

interface ArbitrageOpportunityRecord {
	opportunity: ArbitrageOpportunity
	inception: Date
	isSubjectToDeletion: boolean // sets false at the start of new monitoring loop
	messages: MessageResponse[]
}

type ID = `${string}:${string}`

const opportunityRecords = new Map<ID, ArbitrageOpportunityRecord>()

runFuncWithDelay(monitor, POLL_INTERVAL_MS).catch(console.error)

async function monitor() {
	const opportunities = await getArbitrageOpportunities()

	opportunityRecords.forEach((record) => {
		record.isSubjectToDeletion = true
	})

	await processOpportunities(opportunities)

	// Clean up outdated opportunities
	for (const [key, record] of opportunityRecords.entries()) {
		if (record.isSubjectToDeletion) {
			opportunityRecords.delete(key)
		}
	}
}

async function processOpportunities(opportunities: ArbitrageOpportunity[]) {
	const suitableOpportunities = []

	for (const opportunity of opportunities) {
		const isProfitable =
			opportunity.potentialProfit?.profitUSD &&
			opportunity.potentialProfit.profitUSD > MIN_PROFIT_TO_NOTIFY

		const isSpread =
			Math.abs(opportunity.priceDiffPercent) > MIN_DIFFERENCE_TO_NOTIFY

		if (isProfitable || isSpread) {
			suitableOpportunities.push(opportunity)
		}
	}

	for (const opportunity of suitableOpportunities) {
		const id = getOpportunityID(opportunity)

		if (!opportunityRecords.has(id)) {
			// Set new opportunity
			opportunityRecords.set(id, {
				opportunity,
				inception: new Date(),
				isSubjectToDeletion: false,
				messages: [],
			})

			const messages =
				await NotificationService.sendNotificationsOnOpportunity(
					opportunity,
					opportunityRecords.get(id)!.inception,
				)

			opportunityRecords.set(id, {
				opportunity,
				inception: new Date(),
				isSubjectToDeletion: false,
				messages: messages.filter((message) => message !== undefined),
			})
		} else {
			// Update existing opportunity
			const record = opportunityRecords.get(id)!
			record.isSubjectToDeletion = false

			await NotificationService.editNotificationsOnOpportunity(
				opportunity,
				record.inception,
				record.messages,
			)
		}
	}
}

function getOpportunityID(opportunity: ArbitrageOpportunity): ID {
	return `${opportunity.pool.chainName}:${opportunity.pool.address}` as ID
}
