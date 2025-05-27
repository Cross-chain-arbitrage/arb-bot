import {
	ArbitrageOpportunity,
	getArbitrageOpportunities,
} from './getArbitrageOpportunities'
import { infinitePoll } from './utils/polling'

const MIN_DIFFERENCE_TO_NOTIFY = 2
const MIN_PROFIT_TO_NOTIFY = 4

const BOT_TOKEN = getBotToken()
const TG_USER_IDS_TO_NOTIFY = getUserIDsToNotify()

const POLL_INTERVAL_MS = 5 * 60 * 1000

infinitePoll(monitor, POLL_INTERVAL_MS).catch(console.error)

async function monitor() {
	const opportunities = await getArbitrageOpportunities()

	for (const opportunity of opportunities) {
		const isProfitable =
			opportunity.potentialProfit?.profitUSD &&
			opportunity.potentialProfit.profitUSD > MIN_PROFIT_TO_NOTIFY

		const isSpread = opportunity.priceDiffPercent > MIN_DIFFERENCE_TO_NOTIFY

		if (isProfitable || isSpread) {
			await notifyInTelegram(opportunity)
		}
	}
}

async function notifyInTelegram(opportunity: ArbitrageOpportunity) {
	const { pool } = opportunity
	const pair = `${opportunity.token0Symbol}/${opportunity.token1Symbol}`

	let message =
		`🔄 *Arbitrage ${pair} on ${pool.chainName}!* 🔄\n\n` +
		`Pool: ${pool.address} (${pool.type})\n` +
		`Tokens: ${pair}\n\n` +
		`👀 *Price Lookup* 👀\n` +
		`Expected Price: ${opportunity.expectedPrice}\n` +
		`Actual Price: ${opportunity.actualPrice}\n` +
		`Price Difference: ${opportunity.priceDiffPercent.toFixed(2)}%\n`

	if (opportunity.potentialProfit) {
		message +=
			`\n💰 *Potential Profit* 💰\n` +
			`Input: ${opportunity.potentialProfit.tokenIn.formatUnits(opportunity.potentialProfit.amountIn)} ${opportunity.potentialProfit.tokenIn.symbol} ($${opportunity.potentialProfit.amountInUSD.toFixed(2)})\n` +
			`Output: ${opportunity.potentialProfit.tokenOut.formatUnits(opportunity.potentialProfit.amountOut)} ${opportunity.potentialProfit.tokenOut.symbol} ($${opportunity.potentialProfit.amountOutUSD.toFixed(2)})\n` +
			`Profit: $${opportunity.potentialProfit.profitUSD.toFixed(2)} USD`
	}

	for (const userId of TG_USER_IDS_TO_NOTIFY) {
		try {
			const response = await fetch(
				`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?parse_mode=MarkdownV2`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						chat_id: userId,
						text: message,
						parse_mode: 'HTML',
					}),
				},
			)

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}
		} catch (error) {
			console.error(`Failed to send message to user ${userId}:`, error)
		}
	}
}

function getBotToken(): string {
	const token = process.env.TG_BOT_TOKEN
	if (!token) {
		throw new Error('TG_BOT_TOKEN is not set')
	}
	return token
}

function getUserIDsToNotify(): number[] {
	const ids = process.env.TG_USER_IDS_TO_NOTIFY
	if (!ids) {
		throw new Error('TG_USER_IDS_TO_NOTIFY is not set')
	}
	return ids.split(',').map(Number)
}
