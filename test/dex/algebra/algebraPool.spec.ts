import { fuse } from 'viem/chains'
import { testPool } from '../../testUtils/testPool'

describe('algebra pool test', () => {
	const wethUsdtPoolAddress = '0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6'
	const wethAddress = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
	const usdtAddress = '0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7'

	testPool({
		chain: fuse,
		poolType: 'ALGEBRA_V1_2',
		poolAddress: wethUsdtPoolAddress,
		assertPoolCreation: {
			token0Address: wethAddress,
			token1Address: usdtAddress,
		},
	})
})
