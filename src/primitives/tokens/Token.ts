import {
	Address,
	erc20Abi,
	isAddress,
	isAddressEqual,
	maxUint256,
	TransactionReceipt,
} from 'viem'
import { ChainClientService } from '../../utils/ChainClientService'
import { NATIVE_ADDRESS, STARGATE_NATIVE_ADDRESS } from './NativeCurrency'
import { TokenBase, TokenMetadata } from './TokenBase'
import { TokenError } from './TokenErrors'

export class Token extends TokenBase {
	constructor(
		chainClientService: ChainClientService,
		address: Address,
		chainId: number,
		tokenMetadata: TokenMetadata,
	) {
		super(chainClientService, address, chainId, tokenMetadata)
		this.validateTokenAddress(address)
		this.validateDecimals(tokenMetadata.decimals)
	}

	isNative(): false {
		return false
	}

	private validateTokenAddress(address: Address): void {
		if (!isAddress(address)) {
			throw new TokenError(`Invalid address for token ${this.symbol}`)
		}

		if (
			isAddressEqual(address, NATIVE_ADDRESS) ||
			isAddressEqual(address, STARGATE_NATIVE_ADDRESS)
		) {
			throw new TokenError(
				`Cannot make a token from native currency ${this.symbol}`,
			)
		}
	}

	private validateDecimals(decimals: number): void {
		if (decimals < 0 || decimals > 18) {
			throw new TokenError(
				`Invalid token decimals (${decimals}), must be between 0 and 18`,
			)
		}
	}

	async hasEnoughAllowance(
		address: Address,
		spender: Address,
		amount: bigint,
	): Promise<boolean> {
		const allowance = await this.allowance(address, spender)

		return allowance >= amount
	}

	async balanceOf(address: Address): Promise<bigint> {
		const balance = await this.client.readContract({
			address: this.address,
			abi: erc20Abi,
			functionName: 'balanceOf',
			args: [address],
		})
		return balance
	}

	async allowance(address: Address, spender: Address): Promise<bigint> {
		const allowance = await this.client.readContract({
			address: this.address,
			abi: erc20Abi,
			functionName: 'allowance',
			args: [address, spender],
		})
		return allowance
	}

	async approve(
		spender: Address,
		amount: bigint,
	): Promise<TransactionReceipt> {
		const hash = await this.wallet.writeContract({
			address: this.address,
			abi: erc20Abi,
			functionName: 'approve',
			args: [spender, amount],
			account: this.account,
			chain: this.wallet.chain,
		})

		const receipt = await this.client.waitForTransactionReceipt({ hash })

		return receipt
	}

	async approveInfinite(
		spender: Address,
	): Promise<TransactionReceipt | undefined> {
		const allowance = await this.allowance(this.account.address, spender)

		const infiniteThreshold = this.parseUnits('1000000000000000000000000')

		if (allowance >= infiniteThreshold) return

		const hash = await this.approve(spender, maxUint256)

		return hash
	}
}
