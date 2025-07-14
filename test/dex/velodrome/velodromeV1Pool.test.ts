import { swellchain } from 'viem/chains'
import { makeSuite } from '../../testUtils/makeSuite'
import { testPool } from '../../testUtils/testPool'

makeSuite('Velodrome V1 pool test', () => {
	const poolAddress = '0x818eC3274C43A45Ca588b485794644438a3F4653'
	const wethAddress = '0x4200000000000000000000000000000000000006'
	const weeth = '0xA6cB988942610f6731e664379D15fFcfBf282b44'

	testPool({
		chain: swellchain,
		poolType: 'VELODROME_V1',
		poolAddress,
		assertPoolCreation: {
			token0Address: wethAddress,
			token1Address: weeth,
		},
	})
})
