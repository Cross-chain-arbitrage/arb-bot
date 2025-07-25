import { readFileSync } from 'fs'
import * as yaml from 'js-yaml'
import { join } from 'path'
import { getAddress } from 'viem'
import { z } from 'zod'
import { DexRegistry } from '../dex/DexRegistry'
import { PoolType } from '../dex/PoolUtils'

const YAML_CONFIG_FILENAME = 'config.yaml'

const tokenIdScheme = z.string().transform((val) => {
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
})

const addressScheme = z.string().transform((val) => {
	const validAddress = getAddress(val)

	return validAddress
})

const poolTypeScheme = z.string().transform((val) => {
	const validPoolType = Object.keys(DexRegistry).find((type) => type === val)

	if (!validPoolType) {
		throw new Error(`Invalid pool type: ${val}`)
	}

	return validPoolType as PoolType
})

const configScheme = z.object({
	botName: z.string(),
	giveApprovals: z.boolean(),
	startTokenId: tokenIdScheme,
	minProfitUsd: z.number(),
	opportunityCheckInterval: z.number(),
	arbitrageExecutionTimeout: z.number(),
	graphBuilderConfig: z.object({
		pools: z.array(
			z.object({
				address: addressScheme,
				chainId: z.number(),
				type: poolTypeScheme,
			}),
		),
		connectSecondaryChains: z.boolean(),
		baseChainId: z.number(),
		additionalEdges: z
			.array(
				z.object({
					from: tokenIdScheme,
					to: tokenIdScheme,
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
})

export function loadConfig() {
	const config = yaml.load(
		readFileSync(join(__dirname, YAML_CONFIG_FILENAME), 'utf8'),
	)

	const parsedConfig = configScheme.parse(config)

	return parsedConfig
}
