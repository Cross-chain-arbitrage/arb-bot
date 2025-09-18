import { swellchain } from 'viem/chains'
import { testPool } from '../../testUtils/testPool'

describe('Velodrome V2 pool test', () => {
	const poolAddress = '0x6f96c6f73147db99716a0328eda2b6bff136cdb8'
	const wethAddress = '0x4200000000000000000000000000000000000006'
	const usdeAddress = '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34'

	testPool({
		chainId: swellchain.id,
		poolType: 'VELODROME_V2',
		poolAddress,
		assertPoolCreation: {
			token0Address: wethAddress,
			token1Address: usdeAddress,
		},
	})
})
