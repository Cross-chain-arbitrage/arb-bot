import { exec } from "child_process"
import { toHex } from "viem"
import { encodeAbiParameters } from "viem"
import { keccak256 } from "viem"
import { Client } from "viem"
import { exec as execPromise } from "./helpers"

export async function startAnvil(forkRpcUrl: string) {
	const success = new Promise<void>((resolve) => {
		const anvil = exec(`anvil --fork-url ${forkRpcUrl}`)

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

export async function killAnvil() {
	await execPromise("pkill anvil")
}

/**
 * @param balanceSlotIndex 0 for standard ERC20, 1 for OFT
 */
export async function setTokenBalance(
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

export async function setNativeBalance(
	client: Client,
	address: Address,
	balance: bigint,
) {
	await client.request({
		// @ts-expect-error viem doesn't know about this method
		method: "anvil_setBalance",
		params: [address, toHex(balance, { size: 32 })],
	})
}
