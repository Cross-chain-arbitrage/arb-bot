import { TokenId } from '../../../domain/value-objects/token-id'

export const tokenIdToContract: {
	[tokenId: TokenId]: Address
} = {
	'eip155:1300:0x0000000000000000000000000000000000000000':
		'0x81E7f9EBaBa2cc796b9799c50ECED36E8361174F',
	'eip155:8453:0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4':
		'0xD879bCaa7cDeDe2649A80980bDfAa1B379BC19c5',
}
