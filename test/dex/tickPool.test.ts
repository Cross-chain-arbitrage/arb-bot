import {
	Client,
	erc20Abi,
	getContract,
	GetContractReturnType,
	WalletClient,
} from 'viem'
import { fuse } from 'viem/chains'
import { PoolType, PoolUtils } from '../../src/dex/PoolUtils'
import { TickPool } from '../../src/dex/TickPool'
import { Token } from '../../src/primitives/tokens/Token'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { ClientManager } from '../../src/utils/ClientManager'
import { setTokenBalance, useAnvil } from '../utils/anvil'
import { makeSuite } from '../utils/makeSuite'

/* ======== Constants ======== */

const wethUsdtPoolAddress = '0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6'
const wethAddress = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
const usdtAddress = '0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7'
const usdcAddress = '0xc6Bc407706B7140EE8Eef2f86F9504651b63e7f9'

/* ======== Variables ======== */

let client: Client
let walletClient: WalletClient
let botAddress: Address
let usdtContract: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let wethContract: GetContractReturnType<typeof erc20Abi, WalletClient, Address>
let usdcToken: Token
let pool: TickPool

/* ======== Tests ======== */

makeSuite('TickPool', () => {
	useAnvil({
		chainId: fuse.id,
	})

	beforeAll(async () => {
		client = ClientManager.getClient(fuse.id)
		walletClient = ClientManager.getWalletClient(fuse.id)
		botAddress = walletClient.account!.address

		wethContract = getContract({
			address: wethAddress,
			abi: erc20Abi,
			client,
		})

		usdtContract = getContract({
			address: usdtAddress,
			abi: erc20Abi,
			client,
		})

		usdcToken = await TokenUtils.fromAddress<Token>(usdcAddress, fuse.id)

		pool = (await PoolUtils.createPool(
			wethUsdtPoolAddress,
			fuse.id,
			PoolType.ALGEBRA,
		)) as unknown as TickPool
	})

	it('should correctly convert price to sqrtPriceX96 and vice versa', () => {
		const sqrtPriceX96 = 10000000000n

		const price = pool.sqrtPriceX96ToPrice(sqrtPriceX96)
		const sqrtPriceX962 = pool.priceToSqrtPriceX96(price)

		expect(sqrtPriceX96).toBe(sqrtPriceX962)
	})

	describe('validation', () => {
		it('should throw when tokenIn and tokenOut are the same', async () => {
			await expect(
				pool.validateSwapParams({
					tokenIn: pool.token0,
					tokenOut: pool.token0,
					amountIn: 1000000n,
				}),
			).rejects.toThrow('tokenIn and tokenOut cannot be the same')
		})

		it('should throw when tokenIn is not pool token', async () => {
			await expect(
				pool.validateSwapParams({
					tokenIn: usdcToken,
					tokenOut: pool.token0,
					amountIn: 1000000n,
				}),
			).rejects.toThrow('tokenIn must be token0 or token1')
		})

		it('should throw when tokenOut is not pool token', async () => {
			await expect(
				pool.validateSwapParams({
					tokenIn: pool.token0,
					tokenOut: usdcToken,
					amountIn: 1000000n,
				}),
			).rejects.toThrow('tokenOut must be')
		})

		it('should throw when balance is insufficient', async () => {
			await expect(
				pool.validateSwapParams({
					tokenIn: pool.token0,
					tokenOut: pool.token1,
					amountIn: 1000000000000000000000000n, // Very large amount
				}),
			).rejects.toThrow('Insufficient balance')
		})

		it('should throw when allowance is insufficient', async () => {
			// Set balance but not allowance
			await setTokenBalance(
				botAddress,
				pool.token0.address,
				1n,
				1000000n,
				client,
			)

			await expect(
				pool.validateSwapParams({
					tokenIn: pool.token0,
					tokenOut: pool.token1,
					amountIn: 1000000n,
				}),
			).rejects.toThrow('Insufficient allowance')
		})
	})
})
