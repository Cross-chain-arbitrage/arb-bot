import { exec } from "child_process"
import { exec as execPromise } from "./utils/helpers"
import { fuse } from "viem/chains"
import { PoolType, PoolUtils } from "../src/dex/PoolUtils"

export function algebraPoolTest() {
	beforeAll(async () => {
		await startAnvil()
	})

	afterAll(async () => {
		await execPromise("pkill anvil")
	})

	it("should create algebra pool with correct tokens", async () => {
		const wethUsdtPoolAddress = "0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6"

		const pool = await PoolUtils.createPool(
			wethUsdtPoolAddress,
			fuse.id,
			PoolType.ALGEBRA,
		)

		expect(pool.token0.symbol).toBe("WETH")
		expect(pool.token1.symbol).toBe("USDT")
	})
}

async function startAnvil() {
	const success = new Promise<void>((resolve) => {
		const anvil = exec(`anvil --fork-url ${fuse.rpcUrls.default.http[0]}`)

		anvil.stdout?.on("data", (data) => {
			if ((data as string).includes("Listening on 127.0.0.1:8545")) {
				resolve()
			}
		})
	})

	const timeout = new Promise((_, reject) => {
		setTimeout(() => {
			reject(new Error("Anvil failed to start"))
		}, 5000)
	})

	await Promise.race([success, timeout])
}
