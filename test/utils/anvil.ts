import { exec } from 'child_process'
import { toHex } from 'viem'
import { encodeAbiParameters } from 'viem'
import { keccak256 } from 'viem'
import { Client } from 'viem'
import { exec as execPromise } from './helpers'
import { ClientManager } from '../../src/utils/ClientManager'
import { Chain } from 'viem'
import { getPrivateKey } from '../../src/utils/getAccount'

/* ======== useAnvil ======== */

const testPk =
	'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

/**
 * Starts anvil in describe and replace viem rpc url and private key
 * @param chainId - anvil run as fork of this chain
 * @param blockNumber - fork is from this block number, default is latest
 */
export function useAnvil(chainId: number, blockNumber?: number) {
	const chain = ClientManager.findChainById(chainId)
	const realRpcUrl = chain.rpcUrls.default.http[0]
	const realPk = getPrivateKey()

	beforeAll(async () => {
		await startAnvilAndSetTestEnv(chain, realRpcUrl, blockNumber)
	})

	afterAll(async () => {
		await killAnvilAndRestoreEnv(chain, realRpcUrl, realPk)
	})
}

async function startAnvilAndSetTestEnv(
	chain: Chain,
	realRpcUrl: string,
	blockNumber?: number,
) {
	ClientManager.clearClients()

	process.env.PRIVATE_KEY = testPk
	// @ts-expect-error override readonly property
	chain.rpcUrls.default.http[0] = 'http://localhost:8545'

	await startAnvil(realRpcUrl, blockNumber)
}

async function startAnvil(forkRpcUrl: string, blockNumber?: number) {
	const success = new Promise<void>((resolve) => {
		let command = `anvil --fork-url ${forkRpcUrl}`

		if (typeof blockNumber === 'number') {
			command += ` --fork-block-number ${blockNumber}`
		}

		const anvil = exec(command)

		anvil.stdout?.on('data', (data) => {
			// console.log(data)
			if ((data as string).includes('Listening on 127.0.0.1:8545')) {
				resolve()
			}
		})
	})

	const timeout = new Promise((_, reject) => {
		const timer = setTimeout(() => {
			reject(new Error('Anvil failed to start'))
		}, 5000)

		// if anvil starts successfully, don't need to keep the timer running
		void success.finally(() => clearTimeout(timer))
	})

	await Promise.race([success, timeout])
}

async function killAnvilAndRestoreEnv(
	chain: Chain,
	realRpcUrl: string,
	realPk: string | undefined,
) {
	await killAnvil()
	ClientManager.clearClients()
	// @ts-expect-error override readonly property
	chain.rpcUrls.default.http[0] = realRpcUrl
	process.env.PRIVATE_KEY = realPk
}

async function killAnvil() {
	await execPromise('pkill anvil')
}

/* ======== storage helpers ======== */

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
			[{ type: 'address' }, { type: 'uint256' }],
			[userAddress, balanceSlotIndex],
		),
	)

	await client.request({
		// @ts-expect-error viem doesn't know about this method
		method: 'anvil_setStorageAt',
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
		method: 'anvil_setBalance',
		params: [address, toHex(balance, { size: 32 })],
	})
}
