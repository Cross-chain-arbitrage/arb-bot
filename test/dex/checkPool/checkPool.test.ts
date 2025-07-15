import { Chain, getAddress } from 'viem'
import * as viemChains from 'viem/chains'
import { PoolType } from '../../../src/dex/PoolUtils'
import { DexRegistry } from '../../../src/dex/poolVariety'
import { getAlchemyRpcUrl } from '../../../src/utils/alchemy'
import { makeSuite } from '../../testUtils/makeSuite'
import { testPool } from '../../testUtils/testPool'

if (process.env.CHECK_POOL === 'true') {
	const { chain, poolAddress, rpcUrl, poolType } = getContext()

	makeSuite('Check pool', () =>
		testPool({ chain, poolAddress, rpcUrl, poolType }),
	)
} else {
	it.skip('Skip this file in common tests', () => {})
}

/**
 * Get and validate pool address, chain and rpc url from environment variables
 */
function getContext(): {
	poolAddress: Address
	chain: Chain
	poolType: PoolType
	rpcUrl: string | undefined
} {
	const chain = getAndValidateChain()

	const poolAddress = getAndValidatePoolAddress()

	const rpcUrl = getAndValidateRpcUrl(chain.id)

	const poolType = getAndValidatePoolType()

	return { poolAddress, chain, rpcUrl, poolType }
}

function getAndValidateChain() {
	const processChainId = process.env.CHECK_POOL_CHAIN_ID

	if (!processChainId) {
		throw new Error('chain id is not set')
	}

	const chainId = Number(processChainId)

	if (isNaN(chainId)) {
		throw new Error('chain id is not a number')
	}

	const chain = Object.values(viemChains).find(
		(chain) => chain.id === chainId,
	)

	if (!chain) {
		throw new Error(`Chain with id ${chainId} not found in viem chains`)
	}

	return chain
}

function getAndValidatePoolAddress() {
	const processPoolAddress = process.env.CHECK_POOL_POOL_ADDRESS

	if (!processPoolAddress) {
		throw new Error('pool address is not set')
	}

	const poolAddress = getAddress(processPoolAddress)

	return poolAddress
}

function getAndValidatePoolType() {
	const poolType = process.env.CHECK_POOL_POOL_TYPE

	if (!poolType) {
		throw new Error('pool type is not set')
	}

	if (!Object.keys(DexRegistry).includes(poolType)) {
		throw new Error(
			`Pool type ${poolType} is not valid, use one of the following: ${Object.keys(DexRegistry).join(', ')}`,
		)
	}

	return poolType as PoolType
}

function getAndValidateRpcUrl(chainId: number) {
	let rpcUrl = process.env.CHECK_POOL_RPC_URL

	const useAlchemy = process.env.CHECK_POOL_USE_ALCHEMY === 'true'

	if (useAlchemy && rpcUrl) {
		throw new Error('rpc url is set but alchemy is enabled too')
	}

	if (useAlchemy) {
		rpcUrl = getAlchemyRpcUrl(chainId)
	}

	return rpcUrl
}
