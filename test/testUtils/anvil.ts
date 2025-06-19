import { ChildProcess, exec } from 'child_process'
import getPort from 'get-port'
import { Chain, Client, encodeAbiParameters, keccak256, toHex } from 'viem'
import { ClientManager } from '../../src/utils/ClientManager'
import { getPrivateKey } from '../../src/utils/getAccount'

/* ======== useAnvil ======== */

const testPk =
	'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

/**
 * Starts anvil in describe and replace viem rpc url and private key
 */
export function useAnvil(anvilConfig: AnvilConfig) {
	const chain = ClientManager.findChainById(anvilConfig.chainId)

	const defaultRpcUrl = chain.rpcUrls.default.http[0]

	const realPk = getPrivateKey()

	const anvil = new Anvil(anvilConfig)

	beforeAll(async () => {
		await startAnvilAndSetTestEnv(anvil, chain, defaultRpcUrl)
	})

	afterAll(() => {
		killAnvilAndRestoreEnv(anvil, chain, defaultRpcUrl, realPk)
	})

	return anvil
}

async function startAnvilAndSetTestEnv(
	anvil: Anvil,
	chain: Chain,
	defaultRpcUrl: string,
) {
	ClientManager.clearClients()

	process.env.PRIVATE_KEY = testPk

	await anvil.start(defaultRpcUrl)

	// @ts-expect-error override readonly property
	chain.rpcUrls.default.http[0] = `http://localhost:${anvil.port}`
}

function killAnvilAndRestoreEnv(
	anvil: Anvil,
	chain: Chain,
	defaultRpcUrl: string,
	realPk: string | undefined,
) {
	anvil.stop()
	ClientManager.clearClients()
	// @ts-expect-error override readonly property
	chain.rpcUrls.default.http[0] = defaultRpcUrl
	process.env.PRIVATE_KEY = realPk
}

class Anvil {
	readonly config: AnvilConfig
	private _port: number | undefined
	private _process: ChildProcess | undefined

	get port() {
		if (!this._port) {
			throw new Error('Anvil not started')
		}

		return this._port
	}

	get process() {
		if (!this._process) {
			throw new Error('Anvil not started')
		}

		return this._process
	}

	constructor(config: AnvilConfig) {
		this.config = config
	}

	public async start(fallbackRpcUrl: string) {
		this._port = this.config.port ?? (await getPort())

		const command = this.buildCommand(fallbackRpcUrl)

		this._process = exec(command)

		await this.onAnvilStart()
	}

	public stop() {
		if (this.process) {
			this.process.kill('SIGTERM')
		}
	}

	private buildCommand(fallbackRpcUrl: string) {
		const rpcUrlToUse = this.config.rpcUrl ?? fallbackRpcUrl

		let command = `anvil --fork-url "${rpcUrlToUse}" --port ${this.port}`

		if (typeof this.config.blockNumber === 'number') {
			command += ` --fork-block-number ${this.config.blockNumber}`
		}

		if (typeof this.config.blockTime === 'number') {
			command += ` --block-time ${this.config.blockTime}`
		}

		// console.log(command)
		return command
	}

	private onAnvilStart() {
		return new Promise<void>((resolve, reject) => {
			const process = this.process

			process?.stdout?.on('data', (data) => {
				if (
					(data as string).includes(
						`Listening on 127.0.0.1:${this.port}`,
					)
				) {
					resolve()
				}
			})

			process?.stderr?.on('data', (data) => {
				if ((data as string).includes('Error:')) {
					reject(new Error('Anvil failed to start'))
				}
			})

			const timer = setTimeout(() => {
				reject(new Error('Anvil failed to start'))
			}, this.config.timeoutStartAnvil || 5000)

			process?.stdout?.on('data', () => clearTimeout(timer))
		})
	}
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
