import { AxiosError } from 'axios'
import { Logger, PinoLogger } from 'nestjs-pino'
import { stdSerializers } from 'pino'
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

const axiosErrorSerializer = (err: unknown) => {
	if (err instanceof AxiosError) {
		return {
			stack: err.stack,
			type: err.name,
			message: err.message,
			status: err.status,
			data: err.response?.data,
		}
	}

	if (err instanceof Error) {
		return stdSerializers.err(err)
	}

	return err
}

export const pinoLogger = new Logger(
	new PinoLogger({
		pinoHttp: {
			transport,
			formatters: {
				level(label) {
					return { level: label }
				},
			},
			serializers: {
				err: axiosErrorSerializer,
			},
			timestamp: () => `,"time":"${new Date().toISOString()}"`,
			level: 'debug',
		},
	}),
	{},
)
