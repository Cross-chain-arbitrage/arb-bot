import { getAddress } from 'viem'
import { DexRegistry } from '../../../src/dex/DexRegistry'
import { PoolType } from '../../../src/dex/PoolUtils'
import { getAlchemyRpcUrl } from '../../../src/utils/alchemy'
import { testPool } from '../../testUtils/testPool'

if (process.env.CHECK_POOL === 'true') {
	const { chainId, poolAddress, rpcUrl, poolType } = getContext()

	describe('Check pool', () =>
		testPool({ chainId, poolAddress, rpcUrl, poolType }))
} else {
	it.skip('Skip this file in common tests', () => {})
}

/**
 * Get and validate pool address, chain and rpc url from environment variables
 */
function getContext(): {
	poolAddress: Address
	chainId: number
	poolType: PoolType
	rpcUrl: string | undefined
} {
	const chainId = getAndValidateChainId()

	const poolAddress = getAndValidatePoolAddress()

	const rpcUrl = getAndValidateRpcUrl(chainId)

	const poolType = getAndValidatePoolType()

	return { poolAddress, chainId, rpcUrl, poolType }
}

function getAndValidateChainId() {
	const processChainId = process.env.CHECK_POOL_CHAIN_ID

	if (!processChainId) {
		throw new Error('chain id is not set')
	}

	const chainId = Number(processChainId)

	if (isNaN(chainId)) {
		throw new Error('chain id is not a number')
	}

	return chainId
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
