import { Injectable } from '@nestjs/common'
import { isAddressEqual, zeroAddress, zeroHash } from 'viem'
import { arbitrum, base, bsc, fuse, mainnet, optimism } from 'viem/chains'
import { FUSE_ERC20_BRIDGE_ABI_ON_FOREIGN_CHAIN } from '../../abi/fuse/erc20BridgeForeign'
import { FUSE_ERC20_BRIDGE_ABI_ON_FUSE } from '../../abi/fuse/erc20BridgeHome'
import { FUSE_BRIDGE_HOME_ABI } from '../../abi/fuse/fuseBridgeHome'
import { LayerZeroScanAPI } from '../../dataApi/layerzeroscan/LayerZeroScanAPI'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { TokenAmount } from '../../primitives/tokens/TokenAmount'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ChainClientService } from '../../utils/ChainClientService'
import { createCustomError } from '../../utils/common'
import { FuseBridgeTx } from './FuseBridgeTx'
import { FUSE_BRIDGE_SUPPORTED_CHAINS } from './supportedChain'
import { FUSE_BRIDGE_SUPPORTED_TOKENS } from './supportedTokens'

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

const ADAPTER_PARAMS =
	'0x000100000000000000000000000000000000000000000000000000000000000493e0' as Hex

const BRIDGE_GAS_COST = 400_000n

@Injectable()
export class FuseBridge {
	constructor(
		private readonly chainClientService: ChainClientService,
		private readonly tokenUtils: TokenUtils,
		private readonly layerZeroScanAPI: LayerZeroScanAPI,
	) {}

	async bridge(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		recipient: Address,
		amount: bigint,
		simulateOnly: boolean = false,
	): Promise<{
		bridgeTx: FuseBridgeTx
		lzFee: TokenAmount
	}> {
		const unwrapWeth = false

		const wallet = this.chainClientService.getWalletClient(tokenIn.chainId)

		await this.validateBalance(tokenIn, wallet.account.address, amount)

		const { quote } = await this.quoteBridge(tokenIn, toChainId, amount)

		const { address, abi } = this.getBridge(tokenIn, toChainId)

		if (
			!(tokenIn instanceof NativeCurrency) &&
			tokenIn.chainId !== fuse.id
		) {
			await this.validateAllowance(
				wallet.account.address,
				address,
				amount,
				tokenIn,
			)
		}

		const args = this.getBridgeArgs(
			tokenIn,
			toChainId,
			recipient,
			amount,
			unwrapWeth,
		)

		if (tokenIn instanceof NativeCurrency) {
			return {
				bridgeTx: await this.executeNativeBridge(
					tokenIn,
					address,
					amount,
					quote,
					args as HomeFuseBridgeFunctionArgs,
					simulateOnly,
				),
				lzFee: new TokenAmount(
					this.chainClientService,
					this.tokenUtils.getNative(tokenIn.chainId),
					quote[0],
				),
			}
		} else {
			return {
				bridgeTx: await this.executeForeignBridge(
					tokenIn,
					address,
					abi,
					quote,
					args as FuseForeignBridgeFunctionArgs,
					simulateOnly,
				),
				lzFee: new TokenAmount(
					this.chainClientService,
					this.tokenUtils.getNative(tokenIn.chainId),
					quote[0],
				),
			}
		}
	}

	private async executeNativeBridge(
		tokenIn: Token | NativeCurrency,
		bridgeAddress: Address,
		amount: bigint,
		quote: [bigint, bigint],
		args: HomeFuseBridgeFunctionArgs,
		simulateOnly: boolean = false,
	) {
		const client = this.chainClientService.getClient(fuse.id)
		const wallet = this.chainClientService.getWalletClient(fuse.id)

		const { request } = await client.simulateContract({
			address: bridgeAddress,
			abi: FUSE_BRIDGE_HOME_ABI,
			functionName: 'bridgeNative',
			account: wallet.account,
			value: amount + quote[0],
			args: args,
		})

		if (simulateOnly) {
			return new FuseBridgeTx(
				this.layerZeroScanAPI,
				zeroHash,
				tokenIn.chainId,
			)
		}

		const txHash = await wallet.writeContract(request)

		return new FuseBridgeTx(this.layerZeroScanAPI, txHash, fuse.id)
	}

	private async executeForeignBridge(
		tokenIn: Token | NativeCurrency,
		bridgeAddress: Address,
		abi:
			| typeof FUSE_ERC20_BRIDGE_ABI_ON_FOREIGN_CHAIN
			| typeof FUSE_ERC20_BRIDGE_ABI_ON_FUSE,
		quote: [bigint, bigint],
		args: FuseForeignBridgeFunctionArgs,
		simulateOnly: boolean = false,
	) {
		const client = this.chainClientService.getClient(tokenIn.chainId)
		const wallet = this.chainClientService.getWalletClient(tokenIn.chainId)

		const result = await client.simulateContract({
			address: bridgeAddress,
			abi,
			functionName: 'bridge',
			account: wallet.account,
			value: quote[0],
			args: args,
		})

		if (simulateOnly) {
			return new FuseBridgeTx(
				this.layerZeroScanAPI,
				zeroHash,
				tokenIn.chainId,
			)
		}

		const txHash = await wallet.writeContract(result.request)

		return new FuseBridgeTx(this.layerZeroScanAPI, txHash, tokenIn.chainId)
	}

	async approveToBridge(
		tokenIn: Token | NativeCurrency,
		amount: bigint,
		toChainId: number,
	) {
		if (tokenIn instanceof NativeCurrency) return

		const bridge = this.getBridge(tokenIn, toChainId)

		const wallet = this.chainClientService.getWalletClient(tokenIn.chainId)
		const userAddr = wallet.account.address

		const allowance = await tokenIn.allowance(userAddr, bridge.address)

		if (allowance >= amount) return

		const tx = await tokenIn.approve(bridge.address, amount)

		return tx
	}

	private getBridgeArgs(
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
					ADAPTER_PARAMS,
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
				ADAPTER_PARAMS,
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
				ADAPTER_PARAMS,
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
			ADAPTER_PARAMS,
		] as FuseForeignBridgeFunctionArgs
	}

	async quoteBridge(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		amountIn: bigint,
		useZro: boolean = false,
	): Promise<{
		quote: [bigint, bigint]
		amountOut: bigint
		lzFee: TokenAmount
		gas: bigint
	}> {
		const client = this.chainClientService.getClient(tokenIn.chainId)

		this.validateToken(tokenIn)
		this.validateChain(tokenIn.chainId)
		this.validateChain(toChainId)
		await this.validateBridgingLimit(tokenIn, toChainId, amountIn)

		const { address, abi } = this.getBridge(tokenIn, toChainId)

		const args = this.getEstimateArgs(tokenIn, toChainId, useZro)

		let feeQuote: [bigint, bigint]
		if (this.isFuse(tokenIn) && tokenIn.chainId === fuse.id) {
			feeQuote = (await client.readContract({
				address,
				abi: FUSE_BRIDGE_HOME_ABI,
				functionName: 'estimateBridgeFee',
				args: args as [boolean, Hex],
			})) as [bigint, bigint]
		} else {
			feeQuote = (await client.readContract({
				address,
				abi,
				functionName: 'estimateBridgeFee',
				args: args as [boolean, Hex],
			})) as [bigint, bigint]
		}

		const lzFee = new TokenAmount(
			this.chainClientService,
			this.tokenUtils.getNative(tokenIn.chainId),
			feeQuote[0],
		)

		return {
			quote: feeQuote,
			amountOut: amountIn,
			lzFee,
			gas: BRIDGE_GAS_COST,
		}
	}

	private getEstimateArgs(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		useZro: boolean = false,
	): [number, boolean, Hex] | [boolean, Hex] {
		if (tokenIn instanceof Token && tokenIn.chainId === fuse.id) {
			return [this.getLzV1ChainEid(toChainId), useZro, ADAPTER_PARAMS]
		}

		if (this.isFuse(tokenIn) && tokenIn.chainId !== fuse.id) {
			return [this.getLzV1ChainEid(toChainId), useZro, ADAPTER_PARAMS]
		}

		return [useZro, ADAPTER_PARAMS]
	}

	private async getTvlOnRemoteChain(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
	) {
		const sourceChainId = fuse.id
		const client = this.chainClientService.getClient(sourceChainId)

		const { address } = this.getBridge(tokenIn, toChainId)

		const result = await client.readContract({
			address,
			abi: FUSE_ERC20_BRIDGE_ABI_ON_FUSE,
			functionName: 'totalValueLocked',
			args: [toChainId, tokenIn.address],
		})

		return result
	}

	getBridge(
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

	/* ================ Validations ================ */

	protected validateRecipient(chainId: number, recipient: Address) {
		if (recipient === zeroAddress) {
			throw new FuseBridgeError('Recipient cannot be the zero address')
		}

		const wallet = this.chainClientService.getWalletClient(chainId)

		if (wallet.account.address !== recipient) {
			throw new FuseBridgeError(
				'Recipient is not the same as the wallet address',
			)
		}
	}

	protected validateChain(chainId: number) {
		if (!FUSE_BRIDGE_SUPPORTED_CHAINS.includes(chainId)) {
			throw new FuseBridgeError(`Unsupported chain: ${chainId}`)
		}
	}

	protected validateToken(token: Token | NativeCurrency) {
		const tokenInfo = FUSE_BRIDGE_SUPPORTED_TOKENS.find(
			(t) =>
				token.chainId === t.chainId &&
				isAddressEqual(token.address, t.address),
		)

		if (!tokenInfo) {
			throw new FuseBridgeError(
				`Unsupported token: ${token.address} on chain ${token.chainId}`,
			)
		}
	}

	protected async validateBalance(
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

	protected async validateAllowance(
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

	private async validateBridgingLimit(
		tokenIn: Token | NativeCurrency,
		toChainId: number,
		amount: bigint,
	) {
		if (
			!(tokenIn instanceof NativeCurrency) &&
			tokenIn.chainId === fuse.id
		) {
			const tvl = await this.getTvlOnRemoteChain(tokenIn, toChainId)

			if (amount < tvl) {
				throw new FuseBridgeError('Insufficient TVL on remote chain')
			}
		}
	}

	/* ================ Utils ================ */

	private isFuse(token: Token | NativeCurrency) {
		return isAddressEqual(token.address, FUSE_ADDRESSES[token.chainId])
	}

	private getLzV1ChainEid(chainId: number) {
		if (!LZ_V1_CHAIN_EIDS[chainId]) {
			throw new FuseBridgeError(`Unsupported chain: ${chainId}`)
		}

		return LZ_V1_CHAIN_EIDS[chainId]
	}
}
