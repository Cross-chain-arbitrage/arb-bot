import { arbitrum } from 'viem/chains'
import { GeckoTerminalAPI } from './data-apis/geckoterminal/GeckoTerminalAPI'
import { getPrettyPath } from './graphs/visualization'
import { GraphOptimizer } from './optimizers/GraphOptimizer'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { GigaBigaStrategySetup } from './strategies/GigaBigaGraphStrategy'
import { ClientManager } from './utils/ClientManager'

async function main() {
	ClientManager.useCustomRpcUrl(arbitrum.id)

	const graph = await GigaBigaStrategySetup.setup()

	const startToken = TokenUtils.getNative(arbitrum.id)
	const ethUsd = await GeckoTerminalAPI.getTokenPriceETH()

	const options: GraphOptimizerOptions = {
		initialValueUSD: 100,
		stepUSD: 200,
		stepsAmount: 5,
		maxPathLength: 5,
	}

	const opportunity = await GraphOptimizer.findOpportunity(
		startToken,
		ethUsd,
		graph,
		options,
	)

	if (!opportunity.path) {
		console.log('No arbitrage path found')
		return
	}

	const prettyPath = await getPrettyPath(
		opportunity.path,
		opportunity.edgesWithRate,
		ethUsd,
	)

	console.log(prettyPath)
}

void main()
