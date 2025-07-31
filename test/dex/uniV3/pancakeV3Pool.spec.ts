import { bsc } from 'viem/chains'
import { getAlchemyRpcUrl } from '../../../src/utils/alchemy'
import { testPool } from '../../testUtils/testPool'

describe('Pancake V3 pool test', () => {
	const poolAddress = '0x172fcd41e0913e95784454622d1c3724f546f849'
	const wbnbAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
	const usdtAddress = '0x55d398326f99059ff775485246999027b3197955'

	testPool({
		chain: bsc,
		poolType: 'PANCAKE_V3',
		poolAddress,
		rpcUrl: getAlchemyRpcUrl(bsc.id),
		assertPoolCreation: {
			token0Address: usdtAddress,
			token1Address: wbnbAddress,
		},
	})
})
