import { mainnet } from 'viem/chains'
import { getAlchemyRpcUrl } from '../../../src/core/infrastructure/evm/chain-client/alchemy-utils'
import { testPool } from '../../testUtils/test-pool'

describe('algebra pool test', () => {
	const wethDaiPoolAddress = '0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11'
	const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
	const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
	const chainId = mainnet.id

	testPool({
		chainId: chainId,
		poolType: 'UNI_V2',
		poolAddress: wethDaiPoolAddress,
		rpcUrl: getAlchemyRpcUrl(chainId),
		assertPoolCreation: {
			token0Address: daiAddress,
			token1Address: wethAddress,
		},
	})
})
