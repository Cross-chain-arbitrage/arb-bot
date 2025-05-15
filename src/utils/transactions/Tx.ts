import { Address } from 'viem'

export class Tx {
	constructor(
		public readonly hash: string,
		public readonly chainId: number,
		public readonly from: Address,
		public readonly to: Address,
		public readonly value: bigint,
	) {}
}
