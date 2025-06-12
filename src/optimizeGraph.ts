import { arbitrum } from 'viem/chains'
import { getMermaidGraph } from './graphs/visualization'
import { GraphOptimizer } from './optimizers/GraphOptimizer'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { FuseWbtcGraphStrategy } from './strategies/FuseWbtcGraphStrategy'

async function main() {
	const strategy = await FuseWbtcGraphStrategy.setup()

	const startToken = TokenUtils.getNative(arbitrum.id)
	const ethUsd = 2700

	const opportunity = await GraphOptimizer.findOpportunity(
		startToken,
		ethUsd,
		strategy.graph,
		10,
	)

	console.log('path', opportunity.path)
	console.log('mermaid\n', getMermaidGraph(opportunity.edgesWithRate))
}

void main()
