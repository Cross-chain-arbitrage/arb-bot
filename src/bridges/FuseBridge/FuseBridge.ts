import { zeroAddress, zeroHash } from 'viem'
import { arbitrum, bsc, fuse, optimism } from 'viem/chains'
import { FUSE_ERC20_BRIDGE_ABI_ON_FOREIGN_CHAIN } from '../../abi/fuse/erc20BridgeForeign'
import { FUSE_ERC20_BRIDGE_ABI_ON_FUSE } from '../../abi/fuse/erc20BridgeHome'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { ClientManager } from '../../utils/ClientManager'
import { FuseBridgeTx } from './FuseBridgeTx'

const ERC20_BRIDGE_ETH_CHAINS = '0x081dF5af5d022D4A4a4520D4D0D336B8432fDBBb' // Arb, OP, BSC
const ERC20_BRIDGE_FUSE = '0x353af4878d7452e974538706273887F7ED90Da47'

export class FuseBridgeError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, FuseBridgeError.prototype)
		this.name = 'FuseBridgeError'
	}
}

export const LZ_V1_CHAIN_EIDS: Record<number, number> = {
	[arbitrum.id]: 110,
	[optimism.id]: 111,
	[bsc.id]: 102,
	[fuse.id]: 138,
}

type FuseHomeBridgeFunctionArgs = [
	Address, // localToken
	number, // remoteChainId
	bigint, // amount
	Address, // recipient
	boolean, // unwrapWeth
	{ refundAddress: Address; zroPaymentAddress: Address }, // callParams
	Hex, // adapterParams
]

type FuseForeignBridgeFunctionArgs = [
	Address, // token
	bigint, // amountLD
	Address, // recipient
	{ refundAddress: Address; zroPaymentAddress: Address }, // callParams
	Hex, // adapterParams
]

export class FuseBridge {
	static readonly SUPPORTED_TOKENS = [
		{
			chainId: fuse.id,
			address: '0x34009565bfEeFded0F7e774629a745636Bf35E82',
			symbol: 'WBTC',
		},
		{
			chainId: arbitrum.id,
			address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
			symbol: 'WBTC',
		},
		{
			chainId: optimism.id,
			address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
			symbol: 'WBTC',
		},
		{
			chainId: bsc.id,
			address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
			symbol: 'WBTC',
		},
	]

	public static readonly SUPPORTED_CHAINS: number[] = [
		arbitrum.id,
		optimism.id,
		bsc.id,
		fuse.id,
	]

	// private static readonly DEFAULT_DST_GAS_LIMIT = 300000
	// private static readonly NATIVE_DROP = 0

	private static readonly adapterParams =
		'0x000100000000000000000000000000000000000000000000000000000000000493e0' as Hex

	static async bridge(
		tokenIn: Token,
		toChainId: number,
		recipient: Address,
		amount: bigint,
		simulateOnly: boolean = false,
	): Promise<FuseBridgeTx> {
		const unwrapWeth = false

		this.validateRecipient(tokenIn.chainId, recipient)
		this.validateChain(tokenIn.chainId)
		this.validateChain(toChainId)

		if (tokenIn.chainId === fuse.id) {
			const tvl = await this.getTvlOnRemoteChain(
				toChainId,
				tokenIn.address,
			)

			if (amount < tvl) {
				throw new FuseBridgeError('Insufficient TVL on remote chain')
			}
		}

		const wallet = ClientManager.getWalletClient(tokenIn.chainId)

		await this.validateBalance(tokenIn, wallet.account!.address, amount)

		const client = ClientManager.getClient(tokenIn.chainId)

		const localToken = tokenIn

		const quote = await this.quote(tokenIn, toChainId, false)

		const { address, abi } = this.getBridge(tokenIn.chainId)

		if (tokenIn.chainId !== fuse.id) {
			await this.validateAllowance(
				wallet.account!.address,
				address,
				amount,
				tokenIn,
			)
		}

		const args = this.getBridgeArgs(
			localToken,
			toChainId,
			recipient,
			amount,
			unwrapWeth,
		)

		const { request } = await client.simulateContract({
			address,
			abi,
			functionName: 'bridge',
			account: wallet.account,
			value: quote[0],
			args: args as FuseHomeBridgeFunctionArgs,
		})

		if (simulateOnly) {
			return new FuseBridgeTx(zeroHash, tokenIn.chainId)
		}

		const txHash = await wallet.writeContract(request)

		return new FuseBridgeTx(txHash, tokenIn.chainId)
	}

	static async approveToBridge(
		tokenIn: Token | NativeCurrency,
		amount: bigint,
	) {
		if (tokenIn instanceof NativeCurrency) return

		const bridge = this.getBridge(tokenIn.chainId)

		const wallet = ClientManager.getWalletClient(tokenIn.chainId)
		const userAddr = wallet.account!.address

		const allowance = await tokenIn.allowance(userAddr, bridge.address)

		if (allowance >= amount) return

		const tx = await tokenIn.approve(bridge.address, amount)

		return tx
	}

	private static async validateBalance(
		token: Token,
		recipient: Address,
		amount: bigint,
	) {
		const balance = await token.balanceOf(recipient)

		if (balance < amount) {
			throw new FuseBridgeError(
				`Insufficient balance, needed ${amount}, has ${balance}`,
			)
		}
	}

	private static async validateAllowance(
		recipient: Address,
		bridge: Address,
		amount: bigint,
		token: Token,
	): Promise<void> {
		const allowance = await token.allowance(recipient, bridge)

		if (allowance >= amount) return

		throw new FuseBridgeError(
			`Insufficient allowance of ${token.symbol} from ${recipient} to ${bridge} on chain ${token.chainId}, needed ${amount}, has ${allowance}`,
		)
	}

	private static getBridgeArgs(
		tokenIn: Token,
		toChainId: number,
		recipient: Address,
		amount: bigint,
		unwrapWeth: boolean,
	): FuseHomeBridgeFunctionArgs | FuseForeignBridgeFunctionArgs {
		if (tokenIn.chainId === fuse.id) {
			return [
				tokenIn.address,
				this.getLzV1ChainEid(toChainId),
				amount,
				recipient,
				unwrapWeth,
				{
					refundAddress: recipient,
					zroPaymentAddress: recipient,
				},
				this.adapterParams,
			]
		}
		return [
			tokenIn.address,
			amount,
			recipient,
			{
				refundAddress: recipient,
				zroPaymentAddress: recipient,
			},
			this.adapterParams,
		]
	}

	static async quote(
		tokenIn: Token,
		toChainId: number,
		// amountIn: bigint,
		useZro: boolean = false,
	) {
		const client = ClientManager.getClient(tokenIn.chainId)

		const { address, abi } = this.getBridge(tokenIn.chainId)

		const args = this.getEstimateArgs(tokenIn, toChainId, useZro)

		const result = await client.readContract({
			address,
			abi,
			functionName: 'estimateBridgeFee',
			args: args as [boolean, Hex],
		})

		return result as [bigint, bigint]
	}

	private static getEstimateArgs(
		tokenIn: Token,
		toChainId: number,
		useZro: boolean = false,
	): [number, boolean, Hex] | [boolean, Hex] {
		if (tokenIn.chainId === fuse.id) {
			return [this.getLzV1ChainEid(toChainId), useZro, this.adapterParams]
		}

		return [useZro, this.adapterParams]
	}

	static async getTvlOnRemoteChain(
		remoteChainId: number,
		remoteTokenAddress: Address,
	) {
		const sourceChainId = fuse.id
		const client = ClientManager.getClient(sourceChainId)

		const { address } = this.getBridge(sourceChainId)

		const result = await client.readContract({
			address,
			abi: FUSE_ERC20_BRIDGE_ABI_ON_FUSE,
			functionName: 'totalValueLocked',
			args: [remoteChainId, remoteTokenAddress],
		})

		return result
	}

	static validateChain(chainId: number) {
		if (!this.SUPPORTED_CHAINS.includes(chainId)) {
			throw new FuseBridgeError(`Unsupported chain: ${chainId}`)
		}
	}

	static getBridge(chainId: number): {
		address: Address
		abi:
			| typeof FUSE_ERC20_BRIDGE_ABI_ON_FUSE
			| typeof FUSE_ERC20_BRIDGE_ABI_ON_FOREIGN_CHAIN
	} {
		if (chainId === fuse.id) {
			return {
				address: ERC20_BRIDGE_FUSE,
				abi: FUSE_ERC20_BRIDGE_ABI_ON_FUSE,
			}
		}

		return {
			address: ERC20_BRIDGE_ETH_CHAINS,
			abi: FUSE_ERC20_BRIDGE_ABI_ON_FOREIGN_CHAIN,
		}
	}

	private static getLzV1ChainEid(chainId: number) {
		if (!LZ_V1_CHAIN_EIDS[chainId]) {
			throw new FuseBridgeError(`Unsupported chain: ${chainId}`)
		}

		return LZ_V1_CHAIN_EIDS[chainId]
	}

	static validateRecipient(chainId: number, recipient: Address) {
		if (recipient === zeroAddress) {
			throw new FuseBridgeError('Recipient cannot be the zero address')
		}

		const wallet = ClientManager.getWalletClient(chainId)

		if (wallet.account!.address !== recipient) {
			throw new FuseBridgeError(
				'Recipient is not the same as the wallet address',
			)
		}
	}
}
