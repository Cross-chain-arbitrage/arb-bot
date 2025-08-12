import { gravity } from 'viem/chains'
import { testPool } from '../../testUtils/testPool'

//TODO: migrate test from gravity due to rpc issues (cloudflare block) or replace rpc
describe.skip('algebra v1.9 pool test', () => {
	const wethUsdcPoolAddress = '0xD1607a5a4B8E26BA0dd66a3b79f9f8ed048C1a0b'
	const wethAddress = '0xf6f832466Cd6C21967E0D954109403f36Bc8ceaA'
	const usdcAddress = '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6'

	testPool({
		chainId: gravity.id,
		poolType: 'ALGEBRA_V1_9',
		poolAddress: wethUsdcPoolAddress,
		assertPoolCreation: {
			token0Address: wethAddress,
			token1Address: usdcAddress,
		},
	})
})
