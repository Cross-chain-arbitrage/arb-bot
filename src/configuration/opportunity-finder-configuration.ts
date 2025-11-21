import { readFileSync } from 'fs'
import * as yaml from 'js-yaml'
import { z } from 'zod'
import { ALL_CYCLES_QUOTER_CONFIG_KEY } from '../core/application/use-cases/finding/all-cycles-quoter/all-cycles-quoter'
import { AllCyclesQuoterConfigSchema } from '../core/application/use-cases/finding/all-cycles-quoter/config-schema'
import { opportunityReporterConfigSchema } from '../core/application/use-cases/finding/opportunity-reporter/config-schema'
import { OPPORTUNITY_REPORTER_CONFIG_KEY } from '../core/application/use-cases/finding/opportunity-reporter/opportunity-reporter'
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
	MOCK_CONFIG_KEY,
	mockConfigScheme,
} from '../core/infrastructure/plugins/mock/configuration/mock-config'
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
import { parsePretty } from '../utils/zod'

export const opportunityConfigSchema = z.object({
	[ALL_CYCLES_QUOTER_CONFIG_KEY]: AllCyclesQuoterConfigSchema,
	[OPPORTUNITY_REPORTER_CONFIG_KEY]: opportunityReporterConfigSchema,

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
	[MOCK_CONFIG_KEY]: mockConfigScheme,

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

	const parsedConfig = parsePretty(opportunityConfigSchema, config)

	return parsedConfig
}
