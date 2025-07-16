import pino from 'pino'

const logger = pino({
	formatters: {
		level: (label) => {
			return {
				level: label,
			}
		},
	},
	// transport: {
	// 	target: 'pino-pretty',
	// 	options: {
	// 		colorize: true,
	// 	},
	// },
})

process.on('unhandledRejection', (err) => {
	logger.fatal({ err }, `Unhandled Promise rejection`)
	process.exit(1)
})
process.on('uncaughtException', (err, origin) => {
	logger.fatal({ err, origin }, `Uncaught exception`)
	process.exit(1)
})

export default logger
