import fs from 'fs'
import z from 'zod'
import { arbitrageConfigSchema } from '../src/configuration/configuration'
import { opportunityConfigSchema } from '../src/configuration/opportunity-finder-configuration'

const configFolderPath = './configs'

const isFolderExist = fs.existsSync(configFolderPath)

if (!isFolderExist) fs.mkdirSync(configFolderPath)

const arbitrageSchema = z.toJSONSchema(arbitrageConfigSchema)
fs.writeFileSync(
	`${configFolderPath}/arbitrage-config-schema.json`,
	JSON.stringify(arbitrageSchema, null, 4),
)

const opportunitySchema = z.toJSONSchema(opportunityConfigSchema)
fs.writeFileSync(
	`${configFolderPath}/opportunity-config-schema.json`,
	JSON.stringify(opportunitySchema, null, 4),
)
