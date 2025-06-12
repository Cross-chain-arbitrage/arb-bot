import { arbitrum } from 'viem/chains'
import { GeckoTerminalAPI } from './data-apis/geckoterminal/GeckoTerminalAPI'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { FuseWbtcGraphStrategy } from './strategies/FuseWbtcGraphStrategy'

async function main() {
	const strategy = await FuseWbtcGraphStrategy.setup()

	const startToken = TokenUtils.getNative(arbitrum.id)
	const startAmount = startToken.parseUnits('0.005')

	const { path } = await strategy.findPath(startToken, startAmount)

	if (!path) {
		console.log('No arbitrage path found')
		return
	}

	console.log('=========== Path ============')

	path.edges.forEach((edge) => {
		console.log(
			`${edge.from.symbol} (${edge.from.chainId}) -- ${edge.type} --> ${edge.to.symbol} (${edge.to.chainId})`,
		)
	})

	console.log('=========== Values ============')

	const priceETH = await GeckoTerminalAPI.getTokenPriceETH()

	console.log(
		'Start amount',
		Number(startToken.formatUnits(startAmount)).toFixed(4),
		startToken.symbol,
		`($${(priceETH * Number(startToken.formatUnits(startAmount))).toFixed(2)})`,
	)

	console.log(
		'End amount',
		Number(startToken.formatUnits(path.endAmount)).toFixed(4),
		`($${(priceETH * Number(startToken.formatUnits(path.endAmount))).toFixed(2)})`,
	)

	console.log(
		'Profit amount',
		startToken.formatUnits(path.profitAmount),
		`($${(priceETH * Number(startToken.formatUnits(path.profitAmount))).toFixed(2)})`,
	)
	console.log('Profit percentage', `${path.profitPercentage.toFixed(2)}%`)
}

main()
	.then(() => {
		process.exit(0)
	})
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
