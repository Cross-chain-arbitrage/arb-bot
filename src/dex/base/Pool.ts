import {
	Abi,
	decodeEventLog,
	Hash,
	isAddressEqual,
	TransactionReceipt,
} from 'viem'
import { BaseContract } from '../../primitives/contracts/BaseContract'
import { Token } from '../../primitives/tokens/Token'
import { createCustomError } from '../../utils/common'

/**
 * Simplified type of DecodeEventLogReturnType
 * @dev DecodeEventLogReturnType requires too much code with generics,
 * so we use this simplified type
 */
type DecodedEvent = object & {
	eventName: string
}

export interface PoolConstructorParams {
	immutables: {
		token0: Token
		token1: Token
		factory: Address
	}
	poolAddress: Address
	chainId: number
	routerAddress: Address
	poolAbi: Abi
}

export abstract class Pool extends BaseContract {
	readonly customError: ReturnType<typeof createCustomError>
	readonly DEFAULT_SLIPPAGE: bigint = 50n
	readonly BASIS_POINTS: bigint = 10000n

	readonly token0: Token
	readonly token1: Token
	readonly routerAddress: Address
	readonly factory: Address
	readonly poolAbi: Abi

	constructor(params: PoolConstructorParams) {
		super(params.poolAddress, params.chainId)

		this.customError = createCustomError(`${this.constructor.name}Error`)

		this.token0 = params.immutables.token0
		this.token1 = params.immutables.token1
		this.factory = params.immutables.factory
		this.routerAddress = params.routerAddress
		this.poolAbi = params.poolAbi
	}

	/* ======== CORE FUNCTIONS, SUPPOSE TO BE NOT OVERRIDDEN ======== */

	async quoteSwap(params: SwapParams): Promise<{
		amountOut: bigint
		gas: bigint
	}> {
		this.validateMismatchSwapParams(params)

		const amountOut = await this._quoteSwap(params)

		return { amountOut, gas: 200_000n } //average gas for swap
	}

	async simulateSwap(params: SwapParams): Promise<{
		amountOut: bigint
		request: SimulateRequestWithAccount
	}> {
		this.validateMismatchSwapParams(params)

		await Promise.all([
			this.validateBalance(params),
			this.validateAllowance(params),
		])

		return this._simulateSwap(params)
	}

	async swap(params: SwapParams) {
		const { request } = await this.simulateSwap(params)

		const gas = await this.client.estimateContractGas({
			...request,
		})

		const hash = await this.wallet.writeContract({
			...request,
			account: this.wallet.account,
			gas: this.multiplyGas(gas),
		})

		const receipt = await this.getReceiptSuccessTx(hash)

		const { amountOut, amountIn } = this.parseSwapAmounts(
			receipt,
			params.tokenIn,
			params.tokenOut,
		)

		return { receipt, amountOut, amountIn }
	}

	parseSwapAmounts(
		swapReceipt: TransactionReceipt,
		tokenIn: Token,
		tokenOut: Token,
	): { amountOut: bigint; amountIn: bigint } {
		let swapEvent: DecodedEvent | undefined

		//find swap event from all events
		for (const log of swapReceipt.logs) {
			if (!isAddressEqual(log.address, this.address)) continue

			//if event is not found in abi, viem throws error
			let event: DecodedEvent
			try {
				event = decodeEventLog({
					abi: this.poolAbi,
					data: log.data,
					topics: log.topics,
				})
			} catch {
				continue
			}

			if (event && this._isSwapEvent(event)) {
				swapEvent = event

				break
			}
		}

		if (!swapEvent)
			throw new this.customError(
				`Swap event not found in tx: ${swapReceipt.transactionHash}`,
			)

		return this._defineAmountsFromEvent(swapEvent, tokenIn, tokenOut)
	}

	/* ======== FUNCTIONS TO IMPLEMENT IN DERIVED CLASSES ======== */

	/**
	 * Returns the price of token0 in terms of token1.
	 * @returns The price and additional data, such as sqrtPriceX96 for concentrated liquidity pools.
	 */
	abstract getPrice(): Promise<{ price: number } & object>

	/**
	 * Swap parameter validation is handled by the base class.
	 *
	 * Derived classes need to implement their specific logic.
	 */
	protected abstract _quoteSwap(params: SwapParams): Promise<bigint>

	/**
	 * Swap parameter validation is handled by the base class.
	 *
	 * Derived classes need to implement their specific logic.
	 */
	protected abstract _simulateSwap(params: SwapParams): Promise<{
		amountOut: bigint
		request: SimulateRequestWithAccount
	}>

	/**
	 * In most cases, this is simple checking if event.eventName === 'Swap',
	 * but this method is kept abstract to allow for unique cases in derived classes.
	 * @param event The decoded event from viem's decodeEventLog.
	 */
	protected abstract _isSwapEvent(event: DecodedEvent): boolean

	/**
	 * Determines tokenOut and tokenIn amounts from a decoded swap event.
	 * @param swapEvent The decoded event from viem's decodeEventLog. In derived classes, it is recommended to use the type DecodeEventLogReturnType\<typeof EVENT_ABI> for better type safety.
	 */
	protected abstract _defineAmountsFromEvent(
		swapEvent: DecodedEvent,
		tokenIn: Token,
		tokenOut: Token,
	): { amountOut: bigint; amountIn: bigint }

	/* ======== HELPER FUNCTIONS ======== */

	async validateBalance(swapParams: SwapParams) {
		const { tokenIn, amountIn } = swapParams

		const balance = await tokenIn.balanceOf(this.account.address)

		if (balance < amountIn) {
			throw new this.customError(
				`Insufficient balance, needed ${amountIn}, has ${balance}`,
			)
		}
	}

	async validateAllowance(swapParams: SwapParams) {
		const { tokenIn, amountIn } = swapParams

		const allowance = await tokenIn.allowance(
			this.account.address,
			this.routerAddress,
		)

		if (allowance < amountIn) {
			throw new this.customError(
				`Insufficient allowance, needed ${amountIn}, has ${allowance}`,
			)
		}
	}

	validateMismatchSwapParams(params: SwapParams) {
		if (isAddressEqual(params.tokenIn.address, params.tokenOut.address)) {
			throw new this.customError(
				'tokenIn and tokenOut cannot be the same',
			)
		}

		if (
			!isAddressEqual(params.tokenIn.address, this.token0.address) &&
			!isAddressEqual(params.tokenIn.address, this.token1.address)
		) {
			throw new this.customError(
				`tokenIn must be ${this.token0.toStringFull()} ` +
					`or ${this.token1.toStringFull()}, ` +
					`got ${params.tokenIn.toStringFull()})`,
			)
		}

		if (
			!isAddressEqual(params.tokenOut.address, this.token0.address) &&
			!isAddressEqual(params.tokenOut.address, this.token1.address)
		) {
			throw new this.customError(
				`tokenOut must be ${this.token0.toStringFull()} ` +
					`or ${this.token1.toStringFull()}, ` +
					`got ${params.tokenOut.toStringFull()})`,
			)
		}

		if (params.amountIn <= 0n) {
			throw new this.customError('amountIn cannot be 0 or negative')
		}
	}

	async getReceiptSuccessTx(hash: Hash) {
		const receipt = await this.client.waitForTransactionReceipt({ hash })

		if (receipt.status !== 'success')
			throw new this.customError(`Swap failed, tx: ${hash}`)

		return receipt
	}

	multiplyGas(gas: bigint) {
		//TODO: remove magic number
		return (gas * 15n) / 10n
	}

	calcDeadline(secondsToAdd: number): bigint {
		return BigInt(Math.floor(Date.now() / 1000) + secondsToAdd)
	}

	zeroForOne(tokenIn: Token, tokenOut: Token) {
		if (tokenIn.isSame(tokenOut))
			throw new this.customError(
				`TokenIn and TokenOut cannot be the same: ${tokenIn.address}`,
			)

		return tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase()
	}

	calcMinAmountOut(expectedAmountOut: bigint, slippage: bigint): bigint {
		const BASIS_POINTS = 10000n

		return (expectedAmountOut * (BASIS_POINTS - slippage)) / BASIS_POINTS
	}
}
