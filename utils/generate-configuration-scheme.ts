import fs from 'fs'
import z from 'zod'
import { configScheme } from '../src/configuration/configuration'

const schema = z.toJSONSchema(configScheme)

const configFolderPath = './configs'

const isFolderExist = fs.existsSync(configFolderPath)

if (!isFolderExist) fs.mkdirSync(configFolderPath)

fs.writeFileSync(
	`${configFolderPath}/bot-config-schema.json`,
	JSON.stringify(schema, null, 4),
)
