import { exec } from "child_process"
import { exec as execPromise } from "./utils/helpers"
import { fuse } from "viem/chains"
import { PoolType, PoolUtils } from "../src/dex/PoolUtils"
import { ClientManager } from "../src/utils/ClientManager"
import {
	Client,
	encodeAbiParameters,
	erc20Abi,
	getContract,
	keccak256,
	toHex,
} from "viem"
import { AlgebraPool } from "../src/dex/algebra/Pool"

const wethUsdtPoolAddress = "0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6"
const wethAddress = "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590"
const usdtAddress = "0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7"
const testPk =
	"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

const realFuseRpcUrl = fuse.rpcUrls.default.http[0]
const realPk = process.env.PRIVATE_KEY

async function setTokenBalance(
	userAddress: Address,
	tokenAddress: Address,
	balanceSlotIndex: bigint,
	balance: bigint,
	client: Client,
) {
	const balanceSlot = keccak256(
		encodeAbiParameters(
			[{ type: "address" }, { type: "uint256" }],
			[userAddress, balanceSlotIndex],
		),
	)

	await client.request({
		// @ts-expect-error viem doesn't know about this method
		method: "anvil_setStorageAt",
		params: [tokenAddress, balanceSlot, toHex(balance, { size: 32 })],
	})
}

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

		await setTokenBalance(
			walletClient.account!.address,
			wethAddress,
			balanceSlotIndex,
			10n ** 18n,
			client,
		)

		await setTokenBalance(
			walletClient.account!.address,
			usdtAddress,
			balanceSlotIndex,
			10n ** 18n,
			client,
		)
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

	it("should correctly convert price to sqrtPriceX96 and vice versa", async () => {
		const pool = await PoolUtils.createPool(
			wethUsdtPoolAddress,
			fuse.id,
			PoolType.ALGEBRA,
		)

		const sqrtPriceX96 = 10000000000n

		const price = pool.sqrtPriceX96ToPrice(sqrtPriceX96)
		const sqrtPriceX962 = pool.priceToSqrtPriceX96(price)

		expect(sqrtPriceX96).toBe(sqrtPriceX962)
	})

	it("should simulate and swap token0 to token1", async () => {
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
			args: [(pool as AlgebraPool).routerAddress, amountIn],
			account: walletClient.account!,
			chain: walletClient.chain,
		})

		const usdtContract = getContract({
			address: pool.token1.address,
			abi: erc20Abi,
			client: walletClient,
		})

		const usdtBalanceBefore = await usdtContract.read.balanceOf([
			walletClient.account!.address,
		])

		const { amountOut: simulatedAmountOut } = await pool.simulateSwap({
			tokenIn: pool.token0,
			tokenOut: pool.token1,
			amountIn,
			slippage: 50,
		})

		const { amountOut } = await pool.swap({
			tokenIn: pool.token0,
			tokenOut: pool.token1,
			amountIn,
			slippage: 50,
		})

		const usdtBalanceAfter = await usdtContract.read.balanceOf([
			walletClient.account!.address,
		])

		expect(usdtBalanceAfter).toBe(usdtBalanceBefore + simulatedAmountOut)
		expect(amountOut).toBe(usdtBalanceAfter - usdtBalanceBefore)
	})

	it("should simulate and swap token1 to token0", async () => {
		const pool = await PoolUtils.createPool(
			wethUsdtPoolAddress,
			fuse.id,
			PoolType.ALGEBRA,
		)

		const walletClient = ClientManager.getWalletClient(fuse.id)

		const amountIn = 10n ** 6n

		await walletClient.writeContract({
			address: pool.token1.address,
			abi: erc20Abi,
			functionName: "approve",
			args: [(pool as AlgebraPool).routerAddress, amountIn],
			account: walletClient.account!,
			chain: walletClient.chain,
		})

		const wethContract = getContract({
			address: pool.token0.address,
			abi: erc20Abi,
			client: walletClient,
		})

		const wethBalanceBefore = await wethContract.read.balanceOf([
			walletClient.account!.address,
		])

		const { amountOut: simulatedAmountOut } = await pool.simulateSwap({
			tokenIn: pool.token1,
			tokenOut: pool.token0,
			amountIn,
			slippage: 50,
		})

		const { amountOut } = await pool.swap({
			tokenIn: pool.token1,
			tokenOut: pool.token0,
			amountIn,
			slippage: 50,
		})

		const wethBalanceAfter = await wethContract.read.balanceOf([
			walletClient.account!.address,
		])

		expect(wethBalanceAfter).toBe(wethBalanceBefore + simulatedAmountOut)
		expect(wethBalanceAfter - wethBalanceBefore).toBe(amountOut)
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
