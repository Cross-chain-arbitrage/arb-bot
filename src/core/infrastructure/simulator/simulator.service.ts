import { Injectable } from '@nestjs/common'
import { Simulator } from '../../../../lib/simulator/dist/simulator.node'
import { TokenAmount } from '../../domain/value-objects/token-amount'
import { getAlchemyRpcUrl } from '../evm/chain-client/alchemy-utils'
import { ChainClientService } from '../evm/chain-client/chain-client.service'
import { TokenBase } from '../evm/primitives/tokens/TokenBase'

@Injectable()
export class SimulatorService {
	rustSimulator = new Simulator()

	constructor(private readonly chainClientService: ChainClientService) {}

	async simulate(
		tokenAmountToMint: TokenAmount<TokenBase>,
		calldata: Hex,
		to: Address,
	) {
		const rpcUrl = this.getRpcUrl(tokenAmountToMint.token.chainId)

		const from = this.chainClientService.getWalletClient(
			tokenAmountToMint.token.chainId,
		).account.address

		return await this.rustSimulator.simulate(
			{
				toAddress: to,
				amountIn: tokenAmountToMint.amount.toString(),
				calldata,
				tokenInAddress: tokenAmountToMint.token.address,
				userAddress: from,
			},
			tokenAmountToMint.token.chainId,
			rpcUrl,
		)
	}

	getRpcUrl(chainId: number) {
		let rpcUrl = ''

		try {
			rpcUrl = getAlchemyRpcUrl(chainId)
		} catch {
			rpcUrl =
				this.chainClientService.getChain(chainId).rpcUrls.default
					.http[0]
		}

		return rpcUrl
	}
}
