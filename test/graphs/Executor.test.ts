import { arbitrum } from 'viem/chains'

import { GraphExecutor } from '../../src/graphs/GraphExecutor'
import { WrapEdge } from '../../src/graphs/primitives/Edge'
import { Graph } from '../../src/graphs/primitives/Graph'
import { PriceOracle } from '../../src/modules/PriceOracle/PriceOracle'
import { NativeCurrency } from '../../src/primitives/tokens/NativeCurrency'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { WrappedNative } from '../../src/primitives/tokens/WrappedNative'
import { ClientManager } from '../../src/utils/ChainClientService'
import { getAlchemyRpcUrl } from '../../src/utils/alchemy'
import { useAnvil } from '../testUtils/anvil'
import { makeSuite } from '../testUtils/makeSuite'

/* ======== Constants arbitrum ======== */

const wethArbAddress = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'

/* ======== Variables ======== */

let wethToken: WrappedNative
let nativeCurrency: NativeCurrency

let graph: Graph

makeSuite('GraphExecutor', () => {
	useAnvil({
		chainId: arbitrum.id,
		rpcUrl: getAlchemyRpcUrl(arbitrum.id),
	})

	beforeAll(async () => {
		nativeCurrency = TokenUtils.getNative(arbitrum.id)

		// Use Promise.all to load all tokens concurrently
		const [wethResult] = await Promise.all([
			TokenUtils.fromAddress(wethArbAddress, arbitrum.id),
		])

		wethToken = wethResult as WrappedNative

		graph = new Graph()
	})

	it('should calculate gas cost', async () => {
		const ethPrice = 3000

		jest.spyOn(PriceOracle, 'getPrice').mockResolvedValue(ethPrice)

		const edge = new WrapEdge(nativeCurrency, wethToken, graph)

		const txWithWrap =
			'0xa8e300c58eb7a3282c05b65e028e21a2216860fd1734d87dd51a1ac11c556cd2'

		const receipt = await ClientManager.getClient(
			arbitrum.id,
		).getTransactionReceipt({
			hash: txWithWrap,
		})

		const result = await GraphExecutor.handleExecutionResult(edge, {
			amountOut: wethToken.parseUnits('0.0002'),
			txReceipt: receipt,
		})

		expect(result.txCostInNative).toBe(560980000000n)

		expect(result.executionCostInUsd).toBe(
			(Number(560980000000n) * ethPrice) / 10 ** 18,
		)

		jest.clearAllMocks()
	})
})
