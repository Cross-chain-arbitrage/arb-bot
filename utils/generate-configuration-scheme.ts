import fs from 'fs'
import z from 'zod'
import { configScheme } from '../src/configuration/configuration'

const schema = z.toJSONSchema(configScheme)

fs.writeFileSync('bot-config-schema.json', JSON.stringify(schema, null, 4))
