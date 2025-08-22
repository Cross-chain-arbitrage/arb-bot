import { readFileSync } from 'fs'
import * as yaml from 'js-yaml'
import { z } from 'zod'
import { ARBITRAGE_FINDER_CONFIG_KEY } from '../core/application/use-cases/finding/arbitrage-finder/arbitrage-finder'
import { parsePretty } from '../utils/zod'
import { arbitrageFinderConfigScheme } from './arbitrage-finder-config'

const configScheme = z.object({
	[ARBITRAGE_FINDER_CONFIG_KEY]: arbitrageFinderConfigScheme,
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
