import { readFileSync } from 'fs'
import * as yaml from 'js-yaml'
import { z } from 'zod'
import { ARBITRAGE_EXECUTOR_CONFIG_KEY } from '../core/application/use-cases/execution/arbitrage-executor/arbitrage-executor'
import { ARBITRAGE_FINDER_CONFIG_KEY } from '../core/application/use-cases/finding/arbitrage-finder/arbitrage-finder'
import {
	CHAIN_CLIENT_CONFIG_KEY,
	chainClientConfigScheme,
} from '../core/infrastructure/evm/chain-client/configuration/chain-client-config'
import {
	DEX_CONFIG_KEY,
	dexConfigScheme,
} from '../core/infrastructure/plugins/dex/configuration/dex-config'
import {
	JUPITER_CONFIG_KEY,
	jupiterConfigScheme,
} from '../core/infrastructure/plugins/jupiter/configuration/jupiter-config'
import {
	LIFI_CONFIG_KEY,
	lifiConfigScheme,
} from '../core/infrastructure/plugins/lifi/configuration/lifi-config'
import {
	NATIVE_WRAPPER_CONFIG_KEY,
	nativeWrapperConfigScheme,
} from '../core/infrastructure/plugins/native-wrapper/configuration/native-wrapper-config'
import {
	OFT_CONFIG_KEY,
	oftConfigScheme,
} from '../core/infrastructure/plugins/oft/configuration/oft-config'
import {
	RAYDIUM_CONFIG_KEY,
	raydiumConfigScheme,
} from '../core/infrastructure/plugins/raydium/configuration/raydium-config'
import {
	RELAY_CONFIG_KEY,
	relayConfigScheme,
} from '../core/infrastructure/plugins/relay/configuration/relay-config'
import {
	SIMPLE_STARGATE_CONFIG_KEY,
	simpleStargateConfigScheme,
} from '../core/infrastructure/plugins/simple-stargate/configuration/simple-stargate-config'
import {
	STARGATE_CONFIG_KEY,
	stargateConfigScheme,
} from '../core/infrastructure/plugins/stargate/configuration/stargate-config'
import { ARBITRAGE_SCHEDULER_CONFIG_KEY } from '../core/presentation/arbitrage-scheduler/arbitrage-scheduler'
import { BALANCE_REPORTER_SCHEDULER_CONFIG_KEY } from '../core/presentation/balance-reporter-scheduler.ts/balance-reporter-scheduler'
import { parsePretty } from '../utils/zod'
import { arbitrageExecutorConfigScheme } from './arbitrage-executor-config'
import { arbitrageFinderConfigScheme } from './arbitrage-finder-config'
import { arbitrageSchedulerConfigScheme } from './arbitrage-scheduler-config'
import { balanceReporterSchedulerConfigScheme } from './balance-reporter-scheduler-config'

export const configScheme = z.object({
	botName: z.string(),
	isDryRun: z.boolean(),

	[ARBITRAGE_FINDER_CONFIG_KEY]: arbitrageFinderConfigScheme,
	[ARBITRAGE_EXECUTOR_CONFIG_KEY]: arbitrageExecutorConfigScheme,
	[ARBITRAGE_SCHEDULER_CONFIG_KEY]: arbitrageSchedulerConfigScheme,
	[BALANCE_REPORTER_SCHEDULER_CONFIG_KEY]:
		balanceReporterSchedulerConfigScheme,

	/* ======== PLUGINS ======== */

	[NATIVE_WRAPPER_CONFIG_KEY]: nativeWrapperConfigScheme,
	[STARGATE_CONFIG_KEY]: stargateConfigScheme,
	[DEX_CONFIG_KEY]: dexConfigScheme,
	[RELAY_CONFIG_KEY]: relayConfigScheme,
	[SIMPLE_STARGATE_CONFIG_KEY]: simpleStargateConfigScheme,
	[RAYDIUM_CONFIG_KEY]: raydiumConfigScheme,
	[JUPITER_CONFIG_KEY]: jupiterConfigScheme,
	[LIFI_CONFIG_KEY]: lifiConfigScheme,
	[OFT_CONFIG_KEY]: oftConfigScheme,

	/* ======== INFRASTRUCTURE ======== */

	[CHAIN_CLIENT_CONFIG_KEY]: chainClientConfigScheme,
})

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

	const parsedConfig = parsePretty(configScheme, config)

	return parsedConfig
}
