import { arbitrum, fuse } from 'viem/chains'
import { getMermaidGraph } from './graphs/visualization'
import { GraphOptimizer } from './optimizers/GraphOptimizer'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { FuseWbtcGraphStrategy } from './strategies/FuseWbtcGraphStrategy'

async function main() {
	//@ts-expect-error override readonly property
	fuse.rpcUrls.default.http[0] = 'http://localhost:8545'

	const strategy = await FuseWbtcGraphStrategy.setup()

	const startToken = TokenUtils.getNative(arbitrum.id)
	const ethUsd = 2700

	const options: GraphOptimizerOptions = {
		initialValueUSD: 100,
		stepUSD: 100,
		stepsAmount: 3,
	}

	const opportunity = await GraphOptimizer.findOpportunity(
		startToken,
		ethUsd,
		strategy.graph,
		options,
	)

	console.log('path', opportunity.path)
	console.log('mermaid\n', getMermaidGraph(opportunity.edgesWithRate))
}

void main()
