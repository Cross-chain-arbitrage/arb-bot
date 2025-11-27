import { ChildProcess, exec } from 'child_process'
import getPort from 'get-port'
import {
	Chain,
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
import { ChainClientService } from '../../src/core/infrastructure/evm/chain-client/chain-client.service'

/* ======== useAnvil ======== */

const testPk =
	'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

const testMnemonic =
	'test test test test test test test test test test test junk'

/**
 * Starts anvil in describe() and replace viem rpc url and private key
 */
export function useAnvil(paramsUseAnvil: ParamsUseAnvil | ParamsUseAnvil[]) {
	const anvilAndChains: { anvil: Anvil; chain: Chain }[] = []

	if (paramsUseAnvil instanceof Array) {
		paramsUseAnvil.forEach((params) =>
			anvilAndChains.push(createAnvil(params)),
		)
	} else {
		anvilAndChains.push(createAnvil(paramsUseAnvil))
	}

	beforeAll(async () => {
		const anvilStartPromises = anvilAndChains.map((anvilAndChain) =>
			anvilAndChain.anvil.start(),
		)

		await Promise.all(anvilStartPromises)
	})

	afterAll(() => {
		anvilAndChains.forEach((anvilAndChain) => anvilAndChain.anvil.stop())
	})

	const mockChainClientService = {
		getClient: (chainId: number) => {
			const anvilAndChain = anvilAndChains.find(
				(anvilAndChain) => anvilAndChain.chain.id === chainId,
			)

			if (anvilAndChain === undefined)
				throw new Error(
					`Chain with chain id ${chainId} was not found, ensure that anvil has started with this chain id`,
				)

			const publicClient = createPublicClient({
				chain: defineChain({
					...anvilAndChain.chain,
					rpcUrls: {
						default: {
							http: [
								`http://localhost:${anvilAndChain.anvil.port}`,
							],
						},
					},
				}),
				transport: http(),
			})

			return publicClient as Client
		},
		getWalletClient: (chainId: number) => {
			const anvilAndChain = anvilAndChains.find(
				(anvilAndChain) => anvilAndChain.chain.id === chainId,
			)

			if (anvilAndChain === undefined)
				throw new Error(
					`Chain with chain id ${chainId} was not found, ensure that anvil has started with this chain id`,
				)

			const walletClient = createWalletClient({
				chain: defineChain({
					...anvilAndChain.chain,
					rpcUrls: {
						default: {
							http: [
								`http://localhost:${anvilAndChain.anvil.port}`,
							],
						},
					},
				}),
				transport: http(),
				account: privateKeyToAccount(testPk),
			})

			return walletClient as WalletClient
		},
		getChainNameById: (chainId: number) => {
			return `Anvil ${chainId}`
		},
	} as ChainClientService

	return {
		anvils: anvilAndChains.map((anvilAndChain) => anvilAndChain.anvil),
		mockChainClientService,
	}
}

function createAnvil(paramsUseAnvil: ParamsUseAnvil) {
	let chain: chains.Chain | undefined

	chain = Object.values(chains).find(
		(chain) => chain.id === paramsUseAnvil.chainId,
	)

	if (!chain) {
		chain = createUnknownChain(paramsUseAnvil)
	}

	const defaultRpcUrl = chain.rpcUrls.default.http[0]

	const anvil = new Anvil({
		...paramsUseAnvil,
		rpcUrl: paramsUseAnvil.rpcUrl ?? defaultRpcUrl,
	})

	return { anvil, chain }
}

function createUnknownChain(anvilConfig: ParamsUseAnvil) {
	if (!anvilConfig.rpcUrl) {
		throw new Error(
			`Chain with id ${anvilConfig.chainId} not found in viem chains and no rpcUrl provided for creating unknown chain`,
		)
	}

	return defineChain({
		id: anvilConfig.chainId,
		name: 'Unknown chain',
		rpcUrls: {
			default: { http: [anvilConfig.rpcUrl] },
		},
		nativeCurrency: {
			name: 'Unknown currency',
			symbol: 'UNKNOWN',
			decimals: 18,
		},
	})
}

class Anvil {
	readonly config: ParamsUseAnvil
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

	public async start() {
		this._port = this.config.port ?? (await getPort())

		const command = this.buildCommand()

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

	logFromLastEthCall() {
		const lastEthCallIdx = this.logs.lastIndexOf('eth_call')

		if (lastEthCallIdx !== -1) {
			console.log(`last eth_call: ${this.logs.slice(lastEthCallIdx)}`)
		} else {
			console.log('No eth_call found in logs')
		}
	}

	private buildCommand() {
		const rpcUrlToUse = this.config.rpcUrl

		let command = `anvil --fork-url "${rpcUrlToUse}" --port ${this.port} --mnemonic "${testMnemonic}"`

		if (typeof this.config.blockNumber === 'number') {
			command += ` --fork-block-number ${this.config.blockNumber}`
		}

		if (typeof this.config.blockTime === 'number') {
			command += ` --block-time ${this.config.blockTime}`
		}

		if (this.config.printTraces) {
			command += ` --print-traces`
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
