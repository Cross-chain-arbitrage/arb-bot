import { NodeWithBalance } from './balance-oracle'

export const BALANCE_NOTIFIER_TOKEN = Symbol('BALANCE_NOTIFIER_TOKEN')

export interface BalanceNotifier {
	notifyBalances(balances: NodeWithBalance[]): void
}
