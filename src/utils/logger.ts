import pino from "pino"

const logger = pino({
	transport: {
		target: "pino-pretty",
		options: {
			colorize: true,
		},
	},
})

class Tx {
	hash: string
	confirmed: boolean = false

	constructor(hash: string) {
		this.hash = hash
	}

	confirm() {
		this.confirmed = true
	}

	toString() {
		return `TX: ${this.hash} ${this.confirmed ? "confirmed" : "pending"}`
	}
}

const tx = new Tx("0x123")

logger.info(tx.toString())
logger.warn(tx)
logger.error(tx)

export default logger
