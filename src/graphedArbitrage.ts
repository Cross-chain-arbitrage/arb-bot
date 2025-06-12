import { arbitrum } from 'viem/chains'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { FuseWbtcGraphStrategy } from './strategies/FuseWbtcGraphStrategy'

async function main() {
	const strategy = await FuseWbtcGraphStrategy.setup()

	const startToken = await TokenUtils.getNative(arbitrum.id)
	const startAmount = startToken.parseUnits('0.0001')

	const path = await strategy.findPath(startToken, startAmount)

	await strategy.graph.printTable(startAmount)
	console.log(await strategy.graph.toMermaid(startAmount))

	console.log(path)
}

main()
	.then(() => {
		process.exit(0)
	})
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
