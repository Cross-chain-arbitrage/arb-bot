import { readFileSync } from 'fs'
import * as yaml from 'js-yaml'
import { getAddress } from 'viem'
import { z } from 'zod'
import { chainClientConfigScheme } from '../chain-client/chain-client-config.service'
import { PoolType } from '../dex/PoolUtils'

function parseChainIdAddress(val: string) {
	const [chainId, address] = val.split(':')

	const isValidChainId = !isNaN(Number(chainId)) && Number(chainId) > 0

	if (!isValidChainId) {
		throw new Error(`Invalid chainId: ${chainId}`)
	}

	const validAddress = getAddress(address)

	return {
		chainId: parseInt(chainId),
		address: validAddress,
	}
}

const ChainIdAddressScheme = z.string().transform((val) => {
	return parseChainIdAddress(val)
})

const poolScheme = z
	.object({
		pool: z.string(),
		type: z.string(),
	})
	.transform((val) => {
		const { chainId, address } = parseChainIdAddress(val.pool)

		return {
			chainId,
			address,
			type: val.type as PoolType,
		}
	})

const configScheme = z.object({
	botName: z.string(),
	giveApprovals: z.boolean(),
	isDryRun: z.boolean(),
	startTokenId: ChainIdAddressScheme,
	minProfitUsd: z.number(),
	opportunityCheckInterval: z.number(),
	arbitrageExecutionTimeout: z.number(),
	graphBuilderConfig: z.object({
		pools: z.array(poolScheme),
		connectSecondaryChains: z.boolean(),
		baseChainId: z.number(),
		additionalEdges: z
			.array(
				z.object({
					from: ChainIdAddressScheme,
					to: ChainIdAddressScheme,
					type: z.string(),
				}),
			)
			.optional(),
		edgeCacheTTL: z.number().optional(),
	}),
	graphOptimizerConfig: z.object({
		minStartValueUsd: z.number(),
		maxStartValueUsd: z.number(),
		runCount: z.number(),
		maxPathLength: z.number(),
	}),
	chainClientConfig: chainClientConfigScheme.optional(),
})

export function loadConfig() {
	const YAML_CONFIG_FILENAME = process.env.BOT_CONFIG_PATH

	if (!YAML_CONFIG_FILENAME) {
		throw new Error('BOT_CONFIG_PATH is not set')
	}

	const config = yaml.load(readFileSync(YAML_CONFIG_FILENAME, 'utf8'))

	const parsedConfig = configScheme.parse(config)

	return parsedConfig
}
