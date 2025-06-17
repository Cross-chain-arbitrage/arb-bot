import { arbitrum } from 'viem/chains'
import { getArbitrageOpportunities } from './getArbitrageOpportunities'
import { ClientManager } from './utils/ClientManager'

async function getPoolStats() {
	ClientManager.useCustomRpcUrl(arbitrum.id)
	await getArbitrageOpportunities()
}

getPoolStats().catch(console.error)
