import { hemi } from 'viem/chains'
import { makeSuite } from '../../testUtils/makeSuite'
import { testPool } from '../../testUtils/testPool'

makeSuite('Uniswap V3 pool test', () => {
	const poolAddress = '0xB46335cAcCccb3fDC2A3F40D9Fd253F5F76919A0'
	const wethAddress = '0x4200000000000000000000000000000000000006'
	const usdcAddress = '0xad11a8BEb98bbf61dbb1aa0F6d6F2ECD87b35afA'

	testPool({
		chain: hemi,
		poolType: 'UNI_V3',
		poolAddress,
		assertPoolCreation: {
			token0Address: wethAddress,
			token1Address: usdcAddress,
		},
	})
})
