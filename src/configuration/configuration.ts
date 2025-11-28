import { readFileSync } from 'fs'
import * as yaml from 'js-yaml'
import { z } from 'zod'
import { ARBITRAGE_EXECUTOR_CONFIG_KEY } from '../core/application/use-cases/execution/arbitrage-executor/arbitrage-executor'
import { ALL_CYCLES_QUOTER_CONFIG_KEY } from '../core/application/use-cases/finding/all-cycles-quoter/all-cycles-quoter'
import { AllCyclesQuoterConfigSchema } from '../core/application/use-cases/finding/all-cycles-quoter/config-schema'
import { ARBITRAGE_FINDER_CONFIG_KEY } from '../core/application/use-cases/finding/arbitrage-finder/arbitrage-finder'
import { opportunityReporterConfigSchema } from '../core/application/use-cases/finding/opportunity-reporter/config-schema'
import { OPPORTUNITY_REPORTER_CONFIG_KEY } from '../core/application/use-cases/finding/opportunity-reporter/opportunity-reporter'
import {
	CHAIN_CLIENT_CONFIG_KEY,
	ChainClientConfigSchema,
} from '../core/infrastructure/evm/chain-client/configuration/chain-client-config'
import {
	GRAPH_PLUGINS_KEY,
	SNAPSHOT_PLUGINS_KEY,
} from '../core/infrastructure/plugins/shared/constants'
import { ARBITRAGE_SCHEDULER_CONFIG_KEY } from '../core/presentation/arbitrage-scheduler/arbitrage-scheduler'
import { BALANCE_REPORTER_SCHEDULER_CONFIG_KEY } from '../core/presentation/balance-reporter-scheduler.ts/balance-reporter-scheduler'
import { parsePretty } from '../utils/zod'
import { arbitrageExecutorConfigSchema } from './arbitrage-executor-config'
import { arbitrageFinderConfigSchema } from './arbitrage-finder-config'
import { arbitrageSchedulerConfigSchema } from './arbitrage-scheduler-config'
import { balanceReporterSchedulerConfigSchema } from './balance-reporter-scheduler-config'
import { GraphPluginsConfigSchema } from './graph-plugins'
import { SnapshotPluginsConfigSchema } from './snapshot-plugins'

const APP_TYPE_CONFIG_KEY = 'appType'
export enum AppType {
	DRY_RUN = 'dryRun',
	BOT = 'bot',
	FINDER = 'finder',
}

export const sharedEntries = {
	[CHAIN_CLIENT_CONFIG_KEY]: ChainClientConfigSchema,
	[SNAPSHOT_PLUGINS_KEY]: SnapshotPluginsConfigSchema.optional(),
	[GRAPH_PLUGINS_KEY]: GraphPluginsConfigSchema.optional(),
}

export const DryRunConfigSchema = z.object({
	[APP_TYPE_CONFIG_KEY]: z.literal(AppType.DRY_RUN),

	[ARBITRAGE_FINDER_CONFIG_KEY]: arbitrageFinderConfigSchema,

	...sharedEntries,
})

export const BotConfigSchema = z.object({
	[APP_TYPE_CONFIG_KEY]: z.literal(AppType.BOT),

	botName: z.string(),
	[ARBITRAGE_FINDER_CONFIG_KEY]: arbitrageFinderConfigSchema,
	[ARBITRAGE_EXECUTOR_CONFIG_KEY]: arbitrageExecutorConfigSchema,
	[ARBITRAGE_SCHEDULER_CONFIG_KEY]: arbitrageSchedulerConfigSchema,
	[BALANCE_REPORTER_SCHEDULER_CONFIG_KEY]:
		balanceReporterSchedulerConfigSchema,

	...sharedEntries,
})

export const FinderConfigSchema = z.object({
	[APP_TYPE_CONFIG_KEY]: z.literal(AppType.FINDER),

	[ALL_CYCLES_QUOTER_CONFIG_KEY]: AllCyclesQuoterConfigSchema,
	[OPPORTUNITY_REPORTER_CONFIG_KEY]: opportunityReporterConfigSchema,

	...sharedEntries,
})

export const ConfigSchema = z.union([
	FinderConfigSchema,
	BotConfigSchema,
	DryRunConfigSchema,
])

export function loadConfig() {
	const YAML_CONFIG_FILENAME = process.env.BOT_CONFIG_PATH

	if (!YAML_CONFIG_FILENAME) {
		throw new Error('BOT_CONFIG_PATH is not set')
	}

	const config = yaml.load(readFileSync(YAML_CONFIG_FILENAME, 'utf8'))

	if (!config) {
		throw new Error(
			'Config is not found with path: ' + YAML_CONFIG_FILENAME,
		)
	}

	const parsedConfig = parsePretty(ConfigSchema, config)

	return parsedConfig
}
