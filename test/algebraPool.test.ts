import { exec } from "child_process"
import { exec as execPromise } from "./utils/helpers"
import { fuse } from "viem/chains"
import { PoolType, PoolUtils } from "../src/dex/PoolUtils"
import { ClientManager } from "../src/utils/ClientManager"
import { encodeAbiParameters, erc20Abi, keccak256 } from "viem"
import { AlgebraPool } from "../src/dex/algebra/Pool"

const wethUsdtPoolAddress = "0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6"
const wethAddress = "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590"
const testPk =
	"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

const realFuseRpcUrl = fuse.rpcUrls.default.http[0]
const realPk = process.env.PRIVATE_KEY

export function algebraPoolTest() {
	beforeAll(async () => {
		ClientManager.clearClients()
		// @ts-expect-error override readonly property
		fuse.rpcUrls.default.http[0] = "http://localhost:8545"
		process.env.PRIVATE_KEY = testPk

		await startAnvil()

		const client = ClientManager.getClient(fuse.id)
		const walletClient = ClientManager.getWalletClient(fuse.id)
		await client.request({
			// @ts-expect-error viem doesn't know about this method
			method: "anvil_setBalance",
			params: [
				walletClient.account!.address,
				"0x1000000000000000000000000000000000000000",
			],
		})

		const balanceSlotIndex = 1n

		const balanceSlot = keccak256(
			encodeAbiParameters(
				[{ type: "address" }, { type: "uint256" }],
				[walletClient.account!.address, balanceSlotIndex],
			),
		)

		await client.request({
			// @ts-expect-error viem doesn't know about this method
			method: "anvil_setStorageAt",
			params: [
				wethAddress,
				balanceSlot,
				"0x1000000000000000000000000000000000000000000000000000000000000000",
			],
		})
	})

	afterAll(async () => {
		ClientManager.clearClients()
		// @ts-expect-error override readonly property
		fuse.rpcUrls.default.http[0] = realFuseRpcUrl
		process.env.PRIVATE_KEY = realPk

		await execPromise("pkill anvil")
	})

	it("should create algebra pool with correct tokens", async () => {
		const pool = await PoolUtils.createPool(
			wethUsdtPoolAddress,
			fuse.id,
			PoolType.ALGEBRA,
		)

		expect(pool.token0.symbol).toBe("WETH")
		expect(pool.token1.symbol).toBe("USDT")
	})

	it.only("should simulate a swap", async () => {
		const pool = await PoolUtils.createPool(
			wethUsdtPoolAddress,
			fuse.id,
			PoolType.ALGEBRA,
		)

		const walletClient = ClientManager.getWalletClient(fuse.id)

		const amountIn = 10n ** 15n

		await walletClient.writeContract({
			address: wethAddress,
			abi: erc20Abi,
			functionName: "approve",
			args: [(pool as AlgebraPool).router, amountIn],
			account: walletClient.account!,
			chain: walletClient.chain,
		})

		const simulateResult = await pool.simulateSwap({
			tokenIn: pool.token0,
			tokenOut: pool.token1,
			amountIn,
			slippage: 50,
		})

		console.log("simulateResult", simulateResult)
	})
}

async function startAnvil() {
	const success = new Promise<void>((resolve) => {
		const anvil = exec(`anvil --fork-url ${realFuseRpcUrl}`)

		anvil.stdout?.on("data", (data) => {
			if ((data as string).includes("Listening on 127.0.0.1:8545")) {
				resolve()
			}
		})
	})

	const timeout = new Promise((_, reject) => {
		const timer = setTimeout(() => {
			reject(new Error("Anvil failed to start"))
		}, 5000)

		// if anvil starts successfully, don't need to keep the timer running
		void success.finally(() => clearTimeout(timer))
	})

	await Promise.race([success, timeout])
}
