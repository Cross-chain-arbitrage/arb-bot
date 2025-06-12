import { exec } from 'child_process'
import { Chain, Client, encodeAbiParameters, keccak256, toHex } from 'viem'
import { ClientManager } from '../../src/utils/ClientManager'
import { getPrivateKey } from '../../src/utils/getAccount'
import { exec as execPromise } from './helpers'

/* ======== useAnvil ======== */

const testPk =
	'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

/**
 * Starts anvil in describe and replace viem rpc url and private key
 */
export function useAnvil(anvilConfig: AnvilConfig) {
	const chain = ClientManager.findChainById(anvilConfig.chainId)

	const defaultRpcUrl = chain.rpcUrls.default.http[0]
	const rpcUrlForAnvil = anvilConfig.rpcUrl ?? defaultRpcUrl

	const realPk = getPrivateKey()

	beforeAll(async () => {
		await startAnvilAndSetTestEnv(
			chain,
			rpcUrlForAnvil,
			anvilConfig.blockNumber,
			anvilConfig.timeoutStartAnvil,
		)
	})

	afterAll(async () => {
		await killAnvilAndRestoreEnv(chain, defaultRpcUrl, realPk)
	})
}

async function startAnvilAndSetTestEnv(
	chain: Chain,
	realRpcUrl: string,
	blockNumber?: number,
	timeoutStartAnvil = 5000,
) {
	ClientManager.clearClients()

	process.env.PRIVATE_KEY = testPk
	// @ts-expect-error override readonly property
	chain.rpcUrls.default.http[0] = 'http://localhost:8545'

	await startAnvil(realRpcUrl, blockNumber, timeoutStartAnvil)
}

async function startAnvil(
	forkRpcUrl: string,
	blockNumber?: number,
	timeoutStartAnvil?: number,
) {
	const success = new Promise<void>((resolve, reject) => {
		let command = `anvil --fork-url "${forkRpcUrl}"`

		if (typeof blockNumber === 'number') {
			command += ` --fork-block-number ${blockNumber}`
		}

		// console.log(`executing:\n${command}\nwith timeout ${timeoutStartAnvil}`)

		const anvil = exec(command)

		anvil.stdout?.on('data', (data) => {
			// console.log(data)

			if ((data as string).includes('Listening on 127.0.0.1:8545')) {
				resolve()
			}
		})

		anvil.stderr?.on('data', (data) => {
			// console.error(data)

			if ((data as string).includes('Error:')) {
				reject(new Error('Anvil failed to start'))
			}
		})
	})

	const timeout = new Promise((_, reject) => {
		const timer = setTimeout(() => {
			reject(new Error('Anvil failed to start'))
		}, timeoutStartAnvil)

		// if anvil starts successfully, don't need to keep the timer running
		void success.finally(() => clearTimeout(timer))
	})

	await Promise.race([success, timeout])
}

async function killAnvilAndRestoreEnv(
	chain: Chain,
	defaultRpcUrl: string,
	realPk: string | undefined,
) {
	await killAnvil()
	ClientManager.clearClients()
	// @ts-expect-error override readonly property
	chain.rpcUrls.default.http[0] = defaultRpcUrl
	process.env.PRIVATE_KEY = realPk
}

async function killAnvil() {
	await execPromise('pkill anvil')
}

/* ======== storage helpers ======== */

/**
 * @param balanceSlotIndex 0 for standard ERC20, 1 for OFT
 * @dev WBTC ARB has balance slot 51!!! WTF?
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
