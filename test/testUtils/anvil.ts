import { ChildProcess, exec } from 'child_process'
import getPort from 'get-port'
import { Chain, Client, fallback, FallbackTransport, http, toHex } from 'viem'
import { ClientManager } from '../../src/utils/ClientManager'
import { getPrivateKey } from '../../src/utils/common'

/* ======== useAnvil ======== */

const testPk =
	'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

const testMnemonic =
	'test test test test test test test test test test test junk'

/**
 * Starts anvil in describe() and replace viem rpc url and private key
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

	jest.spyOn(ClientManager, 'getTransport').mockImplementation(
		(): FallbackTransport => {
			return fallback([
				http(`http://localhost:${anvil.port}`, {
					timeout: 20_000,
					retryCount: 2,
					retryDelay: 1000,
				}),
			])
		},
	)

	// chain.rpcUrls.default.http[0] = `http://localhost:${anvil.port}`
}

function killAnvilAndRestoreEnv(
	anvil: Anvil,
	chain: Chain,
	defaultRpcUrl: string,
	realPk: string | undefined,
) {
	anvil.stop()
	jest.clearAllMocks()
	ClientManager.clearClients()
	// chain.rpcUrls.default.http[0] = defaultRpcUrl

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

		// this._process.stdout?.on('data', (data) => {
		// 	console.log('anvil stdout:', data.toString())
		// })

		// this._process.stderr?.on('data', (data) => {
		// 	console.error('anvil stderr:', data.toString())
		// })

		await this.onAnvilStart()
	}

	public stop() {
		if (this.process) {
			this.process.kill('SIGTERM')
		}
	}

	private buildCommand(fallbackRpcUrl: string) {
		const rpcUrlToUse = this.config.rpcUrl ?? fallbackRpcUrl

		let command = `anvil --fork-url "${rpcUrlToUse}" --port ${this.port} --mnemonic "${testMnemonic}"`

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
			const anvilProcess = this.process

			anvilProcess?.stdout?.on('data', (data) => {
				if (
					(data as string).includes(
						`Listening on 127.0.0.1:${this.port}`,
					)
				) {
					resolve()
				}
			})

			anvilProcess?.stderr?.on('data', (data) => {
				if ((data as string).includes('Error:')) {
					console.log(data)
					reject(new Error('Anvil failed to start'))
					process.exit(1)
				}
			})

			const timer = setTimeout(() => {
				reject(new Error('Anvil failed to start'))
			}, this.config.timeoutStartAnvil || 5000)

			anvilProcess?.stdout?.on('data', () => clearTimeout(timer))
		})
	}
}

/* ======== storage helpers ======== */

export async function setTokenBalance(
	userAddress: Address,
	tokenAddress: Address,
	balance: bigint,
	client: Client,
) {
	await client.request({
		// @ts-expect-error viem doesn't know about this method
		method: 'anvil_dealERC20',
		params: [userAddress, tokenAddress, toHex(balance, { size: 32 })],
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
