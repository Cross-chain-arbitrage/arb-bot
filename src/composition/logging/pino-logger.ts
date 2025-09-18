import { LoggerModule } from 'nestjs-pino'
import { getEnvSafe } from '../../utils/common'

const isProd = getEnvSafe('NODE_ENV') === 'production'

export const transport = isProd
	? undefined
	: {
			target: 'pino-pretty',
			options: {
				singleLine: true,
			},
		}

export const pinoLogger = LoggerModule.forRoot({
	pinoHttp: {
		transport,
		formatters: {
			level(label) {
				return { level: label }
			},
		},
	},
})
