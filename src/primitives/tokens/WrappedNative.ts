import { arbitrum, bsc, fuse, hemi, lightlinkPhoenix, story } from 'viem/chains'
import { WETH_ABI } from '../../abi/weth'
import { getAccountAddress } from '../../utils/common'
import { NativeCurrency } from './NativeCurrency'
import { Token } from './Token'
import { WrappedNativeError } from './TokenErrors'
import { TokenUtils } from './TokenUtils'

export const wrappedTokens: Record<number, Address | undefined> = {
	[arbitrum.id]: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
	[lightlinkPhoenix.id]: '0x7EbeF2A4b1B09381Ec5B9dF8C5c6f2dBECA59c73',
	[hemi.id]: '0x4200000000000000000000000000000000000006',
	[fuse.id]: '0x0BE9e53fd7EDaC9F859882AfdDa116645287C629',
	[story.id]: '0x1514000000000000000000000000000000000000',
	[bsc.id]: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
}

export class WrappedNative extends Token {
	readonly native: NativeCurrency

	constructor(
		chainId: number,
		symbol: string,
		decimals: number,
		name: string,
	) {
		const address = wrappedTokens[chainId]

		if (!address) {
			throw new Error(`Wrapped token not found for chain ${chainId}`)
		}

		super(address, chainId, symbol, decimals, name)
		this.native = TokenUtils.getNative(chainId)
	}

	async deposit(amount: bigint) {
		const balance = await this.native.balanceOf(getAccountAddress())

		if (balance < amount) {
			throw new WrappedNativeError('Insufficient balance')
		}

		const hash = await this.wallet.writeContract({
			address: this.address,
			abi: WETH_ABI,
			functionName: 'deposit',
			account: this.wallet.account,
			chain: this.wallet.chain,
			value: amount,
		})

		const receipt = await this.client.waitForTransactionReceipt({ hash })

		if (receipt.status !== 'success')
			throw new WrappedNativeError(`Deposit failed, tx: ${hash}`)

		return receipt
	}

	async withdraw(amount: bigint) {
		const balance = await this.balanceOf(getAccountAddress())

		if (balance < amount) {
			throw new WrappedNativeError('Insufficient balance')
		}

		const hash = await this.wallet.writeContract({
			address: this.address,
			abi: WETH_ABI,
			functionName: 'withdraw',
			account: this.wallet.account,
			chain: this.wallet.chain,
			args: [amount],
		})

		const receipt = await this.client.waitForTransactionReceipt({ hash })

		if (receipt.status !== 'success')
			throw new WrappedNativeError(`Withdraw failed, tx: ${hash}`)

		return receipt
	}
}
