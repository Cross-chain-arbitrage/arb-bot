import {
	arbitrum,
	base,
	bob,
	bsc,
	fuse,
	gravity,
	hemi,
	lightlinkPhoenix,
	monad,
	story,
	superposition,
	swellchain,
} from 'viem/chains'
import { TokenMetadata } from '../../../../domain/entities/token'
import { WETH_ABI } from '../../abi/weth'
import { ChainClientService } from '../../chain-client/chain-client.service'
import { NativeCurrency } from './NativeCurrency'
import { Token } from './Token'
import { WrappedNativeError } from './TokenErrors'

export const wrappedTokens: Record<number, Address | undefined> = {
	[arbitrum.id]: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
	[lightlinkPhoenix.id]: '0x7EbeF2A4b1B09381Ec5B9dF8C5c6f2dBECA59c73',
	[hemi.id]: '0x4200000000000000000000000000000000000006',
	[fuse.id]: '0x0BE9e53fd7EDaC9F859882AfdDa116645287C629',
	[story.id]: '0x1514000000000000000000000000000000000000',
	[bsc.id]: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
	[gravity.id]: '0xBB859E225ac8Fb6BE1C7e38D87b767e95Fef0EbD',
	[base.id]: '0x4200000000000000000000000000000000000006',
	[swellchain.id]: '0x4200000000000000000000000000000000000006',
	[superposition.id]: '0x1fB719f10b56d7a85DCD32f27f897375fB21cfdd',
	[bob.id]: '0x4200000000000000000000000000000000000006',
	[1300]: '0x9a1691D500C54e1d79df2347D170987aa3E527aC',
	[monad.id]: '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A',
}

export class WrappedNative extends Token {
	constructor(
		chainClientService: ChainClientService,
		readonly native: NativeCurrency,
		chainId: number,
		tokenMetadata: TokenMetadata,
	) {
		const address = wrappedTokens[chainId]

		if (!address) {
			throw new Error(`Wrapped token not found for chain ${chainId}`)
		}

		super(chainClientService, address, chainId, tokenMetadata)
	}

	async deposit(amount: bigint) {
		const balance = await this.native.balanceOf(this.wallet.account.address)

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

		return hash
	}

	async withdraw(amount: bigint) {
		const balance = await this.balanceOf(this.wallet.account.address)

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

		return hash
	}
}
