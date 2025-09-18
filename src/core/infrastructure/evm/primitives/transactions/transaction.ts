import { Hash } from 'viem'

export class Tx {
	constructor(
		public readonly hash: Hash,
		public readonly chainId: number,
	) {}
}
