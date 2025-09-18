import { hemi } from 'viem/chains'
import { testPool } from '../../testUtils/test-pool'

describe('Uniswap V3 pool test', () => {
	describe('router v1', () => {
		const poolAddress = '0xB46335cAcCccb3fDC2A3F40D9Fd253F5F76919A0'
		const wethAddress = '0x4200000000000000000000000000000000000006'
		const usdcAddress = '0xad11a8BEb98bbf61dbb1aa0F6d6F2ECD87b35afA'

		testPool({
			chainId: hemi.id,
			poolType: 'UNI_V3',
			poolAddress,
			assertPoolCreation: {
				token0Address: wethAddress,
				token1Address: usdcAddress,
			},
		})
	})

	describe('universal router', () => {
		const poolAddress = '0x3a076d83d18C434fE3a43250479a90040D06aD5B'

		testPool({
			chainId: 1300,
			rpcUrl: 'https://rpc.glue.net',
			poolAddress,
			poolType: 'UNI_V3',
		})
	})
})
