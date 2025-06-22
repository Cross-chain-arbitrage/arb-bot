import { isAddressEqual, zeroAddress, zeroHash } from 'viem'
import { arbitrum, base, bsc, fuse, mainnet, optimism } from 'viem/chains'
import { FUSE_ERC20_BRIDGE_ABI_ON_FOREIGN_CHAIN } from '../../abi/fuse/erc20BridgeForeign'
import { FUSE_ERC20_BRIDGE_ABI_ON_FUSE } from '../../abi/fuse/erc20BridgeHome'
import { FUSE_BRIDGE_HOME_ABI } from '../../abi/fuse/fuseBridgeHome'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { ClientManager } from '../../utils/ClientManager'
import { createCustomError } from '../../utils/common'
import { FuseBridgeTx } from './FuseBridgeTx'

const ERC20_BRIDGE_ETH_CHAINS = '0x081dF5af5d022D4A4a4520D4D0D336B8432fDBBb' // Arb, OP, BSC
const ERC20_BRIDGE_FUSE = '0x353af4878d7452e974538706273887F7ED90Da47'

const FUSE_TOKEN_BRIDGE_ADDRESSES: Record<number, Record<number, Address>> = {
	[fuse.id]: {
		[arbitrum.id]: '0x56dF61E9f39C75e2d84C05753557bEBB9841Eb5B',
		[bsc.id]: '0x6bd341B6C7d6123D28d3DDee6A65d441DbAC1E90',
		[mainnet.id]: '0x6fA258e755A20e46c28239c40125e2847c3eE5E8',
		[base.id]: '0x691118FBDa4B78747B4C1B883ae4396Dac885651',
	},
	[bsc.id]: {
		[fuse.id]: '0xADef29442A11ad9308aC5D012965c887Cf2A53D3',
	},
	[base.id]: {
		[fuse.id]: '0x6041d22c7458A974Cb6E752D75D03D74dcCFf522',
	},
	[mainnet.id]: {
		[fuse.id]: '0x0A40e573C72EFd75933C7a18a42155132122Bc86',
	},
}

const FUSE_ADDRESSES: Record<number, Address> = {
	[fuse.id]: zeroAddress,
	[arbitrum.id]: '0x6b021b3f68491974bE6D4009fEe61a4e3C708fD6',
	[bsc.id]: '0x5857c96dae9cf8511b08cb07f85753c472d36ea3',
	[mainnet.id]: '0x970b9bb2c0444f5e81e9d0efb84c8ccdcdcaf84d',
	[base.id]: '0x01facc69ec7360640aa5898e852326752801674a',
}

export const FuseBridgeError = createCustomError('FuseBridgeError')

export const LZ_V1_CHAIN_EIDS: Record<number, number> = {
	[mainnet.id]: 101,
	[arbitrum.id]: 110,
	[optimism.id]: 111,
	[bsc.id]: 102,
	[fuse.id]: 138,
	[base.id]: 184,
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

type HomeFuseBridgeFunctionArgs = [
	bigint, // amount
	Address, // recipient
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
		{
			chainId: fuse.id,
			symbol: 'FUSE',
			address: zeroAddress,
		},
		{
			chainId: fuse.id,
			symbol: 'WFUSE',
			address: '0x0BE9e53fd7EDaC9F859882AfdDa116645287C629',
		},
		{
			chainId: bsc.id,
			symbol: 'FUSE',
			address: '0x5857c96dae9cf8511b08cb07f85753c472d36ea3',
		},
		{
			chainId: base.id,
			symbol: 'FUSE',
			address: '0x01facc69ec7360640aa5898e852326752801674a',
		},
		{
			chainId: mainnet.id,
			symbol: 'FUSE',
			address: '0x970b9bb2c0444f5e81e9d0efb84c8ccdcdcaf84d',
		},
	]

	public static readonly SUPPORTED_CHAINS: number[] = [
		arbitrum.id,
		optimism.id,
		bsc.id,
		fuse.id,
		base.id,
		mainnet.id,
	]

	// private static readonly DEFAULT_DST_GAS_LIMIT = 300000
	// private static readonly NATIVE_DROP = 0

	private static readonly adapterParams =
		'0x000100000000000000000000000000000000000000000000000000000000000493e0' as Hex

	static async bridge(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		recipient: Address,
		amount: bigint,
		simulateOnly: boolean = false,
	): Promise<FuseBridgeTx> {
		const unwrapWeth = false

		this.validateRecipient(tokenIn.chainId, recipient)
		this.validateChain(tokenIn.chainId)
		this.validateChain(toChainId)

		if (
			!(tokenIn instanceof NativeCurrency) &&
			tokenIn.chainId === fuse.id
		) {
			const tvl = await this.getTvlOnRemoteChain(tokenIn, toChainId)

			if (amount < tvl) {
				throw new FuseBridgeError('Insufficient TVL on remote chain')
			}
		}

		const wallet = ClientManager.getWalletClient(tokenIn.chainId)

		await this.validateBalance(tokenIn, wallet.account!.address, amount)

		const localToken = tokenIn

		const quote = await this.quote(tokenIn, toChainId, false)

		const { address, abi } = this.getBridge(tokenIn, toChainId)

		if (
			!(tokenIn instanceof NativeCurrency) &&
			tokenIn.chainId !== fuse.id
		) {
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

		if (tokenIn instanceof NativeCurrency) {
			return await this.executeNativeBridge(
				tokenIn,
				address,
				amount,
				quote,
				args as HomeFuseBridgeFunctionArgs,
				simulateOnly,
			)
		} else {
			return await this.executeForeignBridge(
				tokenIn,
				address,
				abi,
				quote,
				args as FuseForeignBridgeFunctionArgs,
				simulateOnly,
			)
		}
	}

	static async executeNativeBridge(
		tokenIn: Token | NativeCurrency,
		bridgeAddress: Address,
		amount: bigint,
		quote: [bigint, bigint],
		args: HomeFuseBridgeFunctionArgs,
		simulateOnly: boolean = false,
	) {
		const client = ClientManager.getClient(fuse.id)
		const wallet = ClientManager.getWalletClient(fuse.id)

		const { request } = await client.simulateContract({
			address: bridgeAddress,
			abi: FUSE_BRIDGE_HOME_ABI,
			functionName: 'bridgeNative',
			account: wallet.account,
			value: amount + quote[0],
			args: args,
		})

		if (simulateOnly) {
			return new FuseBridgeTx(zeroHash, tokenIn.chainId)
		}

		const txHash = await wallet.writeContract(request)

		return new FuseBridgeTx(txHash, fuse.id)
	}

	static async executeForeignBridge(
		tokenIn: Token | NativeCurrency,
		bridgeAddress: Address,
		abi:
			| typeof FUSE_ERC20_BRIDGE_ABI_ON_FOREIGN_CHAIN
			| typeof FUSE_ERC20_BRIDGE_ABI_ON_FUSE,
		quote: [bigint, bigint],
		args: FuseForeignBridgeFunctionArgs,
		simulateOnly: boolean = false,
	) {
		const client = ClientManager.getClient(tokenIn.chainId)
		const wallet = ClientManager.getWalletClient(tokenIn.chainId)

		const result = await client.simulateContract({
			address: bridgeAddress,
			abi,
			functionName: 'bridge',
			account: wallet.account,
			value: quote[0],
			args: args,
		})

		if (simulateOnly) {
			return new FuseBridgeTx(zeroHash, tokenIn.chainId)
		}

		const txHash = await wallet.writeContract(result.request)

		return new FuseBridgeTx(txHash, tokenIn.chainId)
	}

	static async approveToBridge(
		tokenIn: Token | NativeCurrency,
		amount: bigint,
		toChainId: number,
	) {
		if (tokenIn instanceof NativeCurrency) return

		const bridge = this.getBridge(tokenIn, toChainId)

		const wallet = ClientManager.getWalletClient(tokenIn.chainId)
		const userAddr = wallet.account!.address

		const allowance = await tokenIn.allowance(userAddr, bridge.address)

		if (allowance >= amount) return

		const tx = await tokenIn.approve(bridge.address, amount)

		return tx
	}

	private static async validateBalance(
		token: Token | NativeCurrency,
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
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		recipient: Address,
		amount: bigint,
		unwrapWeth: boolean,
	):
		| FuseHomeBridgeFunctionArgs
		| FuseForeignBridgeFunctionArgs
		| HomeFuseBridgeFunctionArgs {
		if (tokenIn.chainId === fuse.id) {
			if (tokenIn instanceof NativeCurrency) {
				return [
					amount,
					recipient,
					{ refundAddress: recipient, zroPaymentAddress: recipient },
					this.adapterParams,
				] as HomeFuseBridgeFunctionArgs
			}
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
			] as FuseHomeBridgeFunctionArgs
		}

		if (this.isFuse(tokenIn)) {
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
			] as FuseHomeBridgeFunctionArgs
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
		] as FuseForeignBridgeFunctionArgs
	}

	static async quote(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		// amountIn: bigint,
		useZro: boolean = false,
	): Promise<[bigint, bigint]> {
		const client = ClientManager.getClient(tokenIn.chainId)

		const { address, abi } = this.getBridge(tokenIn, toChainId)

		const args = this.getEstimateArgs(tokenIn, toChainId, useZro)

		if (this.isFuse(tokenIn) && tokenIn.chainId === fuse.id) {
			return client.readContract({
				address,
				abi: FUSE_BRIDGE_HOME_ABI,
				functionName: 'estimateBridgeFee',
				args: args as [boolean, Hex],
			}) as Promise<[bigint, bigint]>
		} else {
			return client.readContract({
				address,
				abi,
				functionName: 'estimateBridgeFee',
				args: args as [boolean, Hex],
			}) as Promise<[bigint, bigint]>
		}
	}

	private static getEstimateArgs(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		useZro: boolean = false,
	): [number, boolean, Hex] | [boolean, Hex] {
		if (tokenIn instanceof Token && tokenIn.chainId === fuse.id) {
			return [this.getLzV1ChainEid(toChainId), useZro, this.adapterParams]
		}

		if (this.isFuse(tokenIn) && tokenIn.chainId !== fuse.id) {
			return [this.getLzV1ChainEid(toChainId), useZro, this.adapterParams]
		}

		return [useZro, this.adapterParams]
	}

	static async getTvlOnRemoteChain(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
	) {
		const sourceChainId = fuse.id
		const client = ClientManager.getClient(sourceChainId)

		const { address } = this.getBridge(tokenIn, toChainId)

		const result = await client.readContract({
			address,
			abi: FUSE_ERC20_BRIDGE_ABI_ON_FUSE,
			functionName: 'totalValueLocked',
			args: [toChainId, tokenIn.address],
		})

		return result
	}

	static validateChain(chainId: number) {
		if (!this.SUPPORTED_CHAINS.includes(chainId)) {
			throw new FuseBridgeError(`Unsupported chain: ${chainId}`)
		}
	}

	static getBridge(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
	): {
		address: Address
		abi:
			| typeof FUSE_ERC20_BRIDGE_ABI_ON_FUSE
			| typeof FUSE_ERC20_BRIDGE_ABI_ON_FOREIGN_CHAIN
		// | typeof FUSE_BRIDGE_HOME_ABI
	} {
		if (tokenIn.chainId === fuse.id) {
			if (tokenIn instanceof NativeCurrency) {
				const address =
					FUSE_TOKEN_BRIDGE_ADDRESSES[tokenIn.chainId][toChainId]

				if (!address) {
					throw new FuseBridgeError(
						`No FUSE bridge address found for ${tokenIn.chainId} to ${toChainId}`,
					)
				}

				return {
					address,
					abi: FUSE_ERC20_BRIDGE_ABI_ON_FUSE,
				}
			}
			return {
				address: ERC20_BRIDGE_FUSE,
				abi: FUSE_ERC20_BRIDGE_ABI_ON_FUSE,
			}
		}

		if (this.isFuse(tokenIn)) {
			return {
				address:
					FUSE_TOKEN_BRIDGE_ADDRESSES[tokenIn.chainId][toChainId],
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

	private static isFuse(token: Token | NativeCurrency) {
		return isAddressEqual(token.address, FUSE_ADDRESSES[token.chainId])
	}
}
