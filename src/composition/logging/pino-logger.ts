import { AxiosError } from 'axios'
import { Logger, PinoLogger } from 'nestjs-pino'
import { stdSerializers } from 'pino'
import { ContextError, getEnvSafe } from '../../utils/common'

const isProd = getEnvSafe('NODE_ENV') === 'production'

export const transport = isProd
	? undefined
	: {
			target: 'pino-pretty',
			options: {
				singleLine: true,
			},
		}

const errorSerializer = (err: unknown) => {
	if (err instanceof AxiosError) {
		return {
			stack: err.stack,
			type: err.name,
			message: err.message,
			status: err.status,
			data: err.response?.data,
		}
	}

	if (err instanceof ContextError) {
		const serializedError = stdSerializers.err(err)

		if (err.context) {
			console.log('ContextError', err.context)
			return { ...serializedError, context: err.context }
		}

		return serializedError
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
				err: errorSerializer,
			},
			timestamp: () => `,"time":"${new Date().toISOString()}"`,
			level: 'debug',
		},
	}),
	{},
)
