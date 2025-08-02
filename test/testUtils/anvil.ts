import { ChildProcess, exec } from 'child_process'
import getPort from 'get-port'
import {
	Client,
	createPublicClient,
	createWalletClient,
	defineChain,
	http,
	toHex,
	WalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import * as chains from 'viem/chains'
import { ChainClientService } from '../../src/chain-client/chain-client.service'

/* ======== useAnvil ======== */

const testPk =
	'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

const testMnemonic =
	'test test test test test test test test test test test junk'

/**
 * Starts anvil in describe() and replace viem rpc url and private key
 */
export function useAnvil(anvilConfig: AnvilConfig) {
	const chain = Object.values(chains).find(
		(chain) => chain.id === anvilConfig.chainId,
	) as chains.Chain

	if (!chain) {
		throw new Error(
			`Chain with id ${anvilConfig.chainId} not found in viem chains`,
		)
	}

	const defaultRpcUrl = chain.rpcUrls.default.http[0]

	const anvil = new Anvil(anvilConfig)

	beforeAll(async () => {
		await anvil.start(defaultRpcUrl)
	})

	afterAll(() => {
		anvil.stop()
	})

	const mockChainClientService = {
		getClient: (chainId: number) => {
			if (chainId !== chain.id) {
				throw new Error(
					`chainClientService from useAnvil support only forked chain, expected ${chain.id}, got ${chainId}`,
				)
			}

			const publicClient = createPublicClient({
				chain: defineChain({
					...chain,
					rpcUrls: {
						default: {
							http: [`http://localhost:${anvil.port}`],
						},
					},
				}),
				transport: http(),
			})

			return publicClient as Client
		},
		getWalletClient: (chainId: number) => {
			if (chainId !== chain.id) {
				throw new Error(
					`chainClientService from useAnvil support only forked chain, expected ${chain.id}, got ${chainId}`,
				)
			}

			const walletClient = createWalletClient({
				chain: defineChain({
					...chain,
					rpcUrls: {
						default: {
							http: [`http://localhost:${anvil.port}`],
						},
					},
				}),
				transport: http(),
				account: privateKeyToAccount(testPk),
			})

			return walletClient as WalletClient
		},
	} as ChainClientService

	return { anvil, mockChainClientService }
}

class Anvil {
	readonly config: AnvilConfig
	private _port: number | undefined
	private _process: ChildProcess | undefined
	logs: string = ''

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

		this._process.stdout?.on('data', (data) => {
			this.logs += data.toString()
		})

		this._process.stderr?.on('data', (data) => {
			this.logs += data.toString()
		})

		await this.onAnvilStart()
	}

	public stop() {
		if (this.process) {
			this.process.kill('SIGTERM')
		}
	}

	private buildCommand(fallbackRpcUrl: string) {
		const rpcUrlToUse = this.config.rpcUrl ?? fallbackRpcUrl

		let command = `anvil --print-traces --fork-url "${rpcUrlToUse}" --port ${this.port} --mnemonic "${testMnemonic}"`

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
