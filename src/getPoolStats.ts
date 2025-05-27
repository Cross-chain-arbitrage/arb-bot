import { getArbitrageOpportunities } from './getArbitrageOpportunities'

async function getPoolStats() {
	await getArbitrageOpportunities()
}

getPoolStats().catch(console.error)
