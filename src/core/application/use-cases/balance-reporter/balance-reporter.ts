import { Inject, Injectable } from '@nestjs/common'
import { Graph } from '../../../domain/entities/graph'
import { Token } from '../../../domain/entities/token'
import {
	BALANCE_NOTIFIER_TOKEN,
	BalanceNotifier,
} from '../../interfaces/balance-notifier'
import {
	BALANCE_ORACLE_TOKEN,
	BalanceOracle,
} from '../../interfaces/balance-oracle'
import { GRAPH_TOKEN } from '../graph-builder/graph-token'

@Injectable()
export class BalanceReporter {
	constructor(
		@Inject(BALANCE_ORACLE_TOKEN)
		private readonly balanceOracle: BalanceOracle,

		@Inject(GRAPH_TOKEN)
		private readonly graph: Graph<Token>,

		@Inject(BALANCE_NOTIFIER_TOKEN)
		private readonly balanceNotifier: BalanceNotifier,
	) {}

	async reportBalances() {
		const balances = await this.getBalances()

		this.balanceNotifier.notifyBalances(balances)
	}

	private async getBalances() {
		const balances = await this.balanceOracle.getBalances(
			Array.from(this.graph.nodes.values()),
		)

		return balances
	}
}
