import { Node } from '../../domain/entities/node'

export const BALANCE_ORACLE_TOKEN = Symbol('BALANCE_ORACLE_TOKEN')

export interface NodeWithBalance<T = Node> {
	node: T
	balance: bigint
	usdValue: number
	isNative: boolean
}

export interface BalanceOracle {
	getBalances(nodes: Node[]): Promise<NodeWithBalance[]>
}
