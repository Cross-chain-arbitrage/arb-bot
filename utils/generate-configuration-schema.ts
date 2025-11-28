import fs from 'fs'
import z from 'zod'
import { ConfigSchema } from '../src/configuration/configuration'

const configFolderPath = './configs'

const isFolderExist = fs.existsSync(configFolderPath)

if (!isFolderExist) fs.mkdirSync(configFolderPath)

const configSchema = z.toJSONSchema(ConfigSchema)
fs.writeFileSync(
	`${configFolderPath}/config-schema.json`,
	JSON.stringify(configSchema, null, 4),
)
