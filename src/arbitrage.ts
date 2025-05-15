import { fuse } from "viem/chains"
import { AlgebraPool } from "./dex/algebra/Pool"
import logger from "./utils/logger"

const poolAddressToMonitor = "0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992"

async function main() {
	const pool = await AlgebraPool.create(poolAddressToMonitor, fuse.id)

	// Get the current price of the pool
	// const currentPrice = await pool.getPrices()
	// logger.info(`Current price: ${currentPrice}`)

	// // Get the current price of the pool
	// const currentPrice = await pool.getPrice()
	// logger.info(`Current price: ${currentPrice}`)
}

main().catch(console.error)
