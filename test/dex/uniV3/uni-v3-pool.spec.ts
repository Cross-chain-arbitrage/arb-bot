import { arbitrum } from 'viem/chains'
import { getAlchemyRpcUrl } from '../../../src/core/infrastructure/evm/chain-client/alchemy-utils'
import { testPool } from '../../testUtils/test-pool'

describe('Uniswap V3 pool test', () => {
	describe('router v1', () => {
		const poolAddress = '0xC6962004f452bE9203591991D15f6b388e09E8D0'
		const wethAddress = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
		const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
		const chainId = arbitrum.id

		testPool({
			chainId: chainId,
			poolType: 'UNI_V3',
			rpcUrl: getAlchemyRpcUrl(chainId),
			poolAddress,
			assertPoolCreation: {
				token0Address: wethAddress,
				token1Address: usdcAddress,
			},
		})
	})

	describe('universal router', () => {
		const poolAddress = '0xD8f4A7667fE621d6224d1c426bD15879CA52Ee58'

		testPool({
			chainId: 1300,
			rpcUrl: 'https://rpc.glue.net',
			poolAddress,
			poolType: 'UNI_V3',
		})
	})
})
