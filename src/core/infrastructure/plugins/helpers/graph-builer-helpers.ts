import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'

export async function getNode(
	this: {
		solanaTokenUtils: SolanaTokenUtils
		tokenUtils: TokenUtils
	},
	nodeConfig: { chainId: number | 'solana'; address: string },
) {
	if (nodeConfig.chainId === 'solana') {
		return this.solanaTokenUtils.fromAddress<SolanaToken>(
			nodeConfig.address,
		)
	}

	return this.tokenUtils.fromAddress(
		nodeConfig.address as `0x${string}`,
		nodeConfig.chainId,
	)
}
