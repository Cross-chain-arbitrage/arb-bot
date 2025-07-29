import { getEnvSafe } from './common'

const isProd = getEnvSafe('NODE_ENV') === 'production'

export const transport = isProd
	? undefined
	: {
			target: 'pino-pretty',
			options: {
				singleLine: true,
			},
		}
