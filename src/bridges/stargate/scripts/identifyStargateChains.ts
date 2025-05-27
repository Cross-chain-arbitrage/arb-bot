// Use Stargate API to retrieve all tokens metadata and corresponding chains
// Identify chains that are included in viem and retrieve their scanner urls
// Use blockscout api to retrieve all contracts, holding those tokens and their liquidity and form a list

import { Address, Chain } from 'viem'

import { BlockscoutAPI } from '../../../data-apis/blockscout/BlockscoutAPI'
import { StargateAPI } from '../StargateAPI'
import logger from '../../../utils/logger'
import { ClientManager } from '../../../utils/ClientManager'

interface TokenMetadata {
	address: Address
	symbol: string
	decimals: number
	chainId: number
}

interface PoolInfo {
	token0: TokenMetadata
	token1: TokenMetadata
	liquidity: bigint
	isContract: boolean
}

const MIN_LIQUIDITY = BigInt(1000) // Minimum liquidity in USD

/* ======== Main Function ======== */

async function main() {
	console.time('getPools')

	// 1. Get all tokens from Stargate API
	const tokens = await StargateAPI.getTokensMetadata()
	logger.info(`Found ${tokens.length} tokens`)

	const chainKeys: Map<string, StargateAPIChain | Chain> = new Map()
	const tokensByChain: Map<
		string,
		{
			address: Address
			symbol: string
		}[]
	> = new Map()
	const unidentifiedChains: Set<string> = new Set()

	const stargateChains = await StargateAPI.getChains()

	for (const token of tokens) {
		if (tokensByChain.has(token.chainKey)) {
			tokensByChain.get(token.chainKey)?.push({
				address: token.token.address,
				symbol: token.token.symbol,
			})
		} else {
			tokensByChain.set(token.chainKey, [
				{
					address: token.token.address,
					symbol: token.token.symbol,
				},
			])
		}

		if (chainKeys.has(token.chainKey)) continue

		let chain: StargateAPIChain | Chain | undefined =
			ClientManager.findChainByName(token.chainKey)

		if (!chain)
			chain = stargateChains.find(
				(chain) => chain.chainKey === token.chainKey,
			)

		if (!chain) {
			unidentifiedChains.add(token.chainKey)
			continue
		}

		chainKeys.set(token.chainKey, chain)
	}

	const supportedTokens = tokens.filter((token) =>
		chainKeys.has(token.chainKey),
	)

	logger.info(`Identified chains count: ${chainKeys.size}`)
	logger.info(`Unidentified chains count: ${unidentifiedChains.size}`)

	console.log(unidentifiedChains)

	// console.log(supportedTokens)
	logger.info(`Supported tokens length: ${supportedTokens.length}`)

	chainKeys.forEach((chain, key) => {
		logger.info(`${key}: ${chain.name}`)
		const explorer = (chain as Chain).blockExplorers?.default
		logger.info(
			`${key}: ${explorer?.url ?? explorer?.apiUrl ?? 'No explorer'}`,
		)

		for (const token of tokensByChain.get(key) ?? []) {
			logger.info(`${token.symbol} - ${token.address}`)
		}

		logger.info('----------------------------')
	})

	// s
	return

	// 3. For each chain, get pools
	const pools: PoolInfo[] = []
	for (const chainId of SUPPORTED_CHAINS) {
		const chainTokens = supportedTokens.filter(
			(token) => token.chainId === chainId,
		)
		const chainPools = await getPoolsForChain(chainId, chainTokens)
		pools.push(...chainPools)
	}

	console.log(`Found ${pools.length} potential pools`)
	console.timeEnd('getPools')
}

async function getPoolsForChain(
	chainId: number,
	tokens: TokenMetadata[],
): Promise<PoolInfo[]> {
	const blockscout = new BlockscoutAPI(
		`https://blockscout.com/${getChainName(chainId)}`,
	)
	const pools: PoolInfo[] = []

	for (const token of tokens) {
		// Get token holders
		const holders = await blockscout.getTokenHolders(token.address)

		// Filter holders by liquidity and contract status
		const potentialPools = holders.filter(
			(holder) => holder.balance >= MIN_LIQUIDITY && holder.isContract,
		)

		// Get token balances for each potential pool
		for (const holder of potentialPools) {
			const balances = await blockscout.getTokenBalances(holder.address)
			const otherTokens = balances.filter(
				(balance) =>
					balance.address !== token.address &&
					tokens.some((t) => t.address === balance.address),
			)

			// Create pool info for each token pair
			for (const otherToken of otherTokens) {
				const token1 = tokens.find(
					(t) => t.address === otherToken.address,
				)
				if (token1) {
					pools.push({
						token0: token,
						token1,
						liquidity: otherToken.balance,
						isContract: true,
					})
				}
			}
		}
	}

	return pools
}

function getChainName(chainId: number): string {
	switch (chainId) {
		case 1:
			return 'eth'
		case 137:
			return 'polygon'
		case 42161:
			return 'arbitrum'
		default:
			throw new Error(`Unsupported chain ID: ${chainId}`)
	}
}

main().catch(console.error)
