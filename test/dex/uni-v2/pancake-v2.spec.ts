import { bsc } from 'viem/chains'
import { getAlchemyRpcUrl } from '../../../src/core/infrastructure/evm/chain-client/alchemy-utils'
import { testPool } from '../../testUtils/test-pool'

describe('algebra pool test', () => {
	const usdtWbnbPoolAddress = '0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE'
	const usdtAddress = '0x55d398326f99059fF775485246999027B3197955'
	const wbnbAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
	const chainId = bsc.id

	testPool({
		chainId: chainId,
		poolType: 'PANCAKE_V2',
		poolAddress: usdtWbnbPoolAddress,
		rpcUrl: getAlchemyRpcUrl(chainId),
		assertPoolCreation: {
			token0Address: usdtAddress,
			token1Address: wbnbAddress,
		},
	})
})
