import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { wait } from '../../../../../utils/common'
import { Edge } from '../../../../domain/entities/edge'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
import { GraphUtils } from '../../../../domain/services/graph-utils'
import { QuotedPath } from '../../../../domain/value-objects/path'
import { EventEmitter } from '../../../events/typed-event-emmiter2'
import { GRAPH_TOKEN } from '../../graph-builder/graph-token'
import { PathQuoter } from '../../path-quoter/path-quoter'
import { AllCyclesQuoterTelemetry } from './all-cycles-quoter-telemetry'
import { AllCyclesQuoterConfig } from './types'

export const ALL_CYCLES_QUOTER_CONFIG_KEY = 'allCyclesQuoter'

@Injectable()
export class AllCyclesQuoter {
	private startToken: Token
	private delayBetweenPathsMs: number
	private startAmount: bigint

	constructor(
		private readonly configService: ConfigService,
		private readonly pathQuoter: PathQuoter,
		private readonly telemetry: AllCyclesQuoterTelemetry,
		private readonly eventEmitter: EventEmitter,

		@Inject(GRAPH_TOKEN)
		private readonly graph: Graph<Token>,
	) {
		const config = this.configService.get<AllCyclesQuoterConfig>(
			ALL_CYCLES_QUOTER_CONFIG_KEY,
		)

		if (!config) {
			throw new Error('Sequential opportunity finder config not found')
		}

		const startToken = Array.from(this.graph.nodes.values()).find(
			(node) =>
				node.id.toLowerCase() === config.startTokenId.toLowerCase(),
		)

		if (!startToken) {
			throw new Error('Start token not found')
		}

		this.startToken = startToken

		const startAmountFormatted = config.startAmount
		this.startAmount = startToken.parseUnits(
			startAmountFormatted.toString(),
		)

		this.delayBetweenPathsMs = config.delayBetweenPathsMs
	}

	//TODO: get from config
	@Cron(CronExpression.EVERY_10_SECONDS, { waitForCompletion: true })
	async callEveryPath() {
		const routes = GraphUtils.getAllRoutes(
			this.graph,
			this.startToken,
			this.startToken,
		)
		console.log('route lengths', routes.length)

		for (const route of routes) {
			if (this.isAllowedRoute(route as Edge<Token>[])) {
				await this.quoteRoute(route)

				await wait(this.delayBetweenPathsMs)
			}
		}
	}

	isAllowedRoute(route: Edge<Token>[]) {
		if (route.length > 4) return false

		return true
	}

	private async quoteRoute(route: Edge[]) {
		try {
			const quotedPath = (await this.pathQuoter.quotePath(
				route,
				this.startAmount,
			)) as QuotedPath<Token>

			this.telemetry.onQuotePath(quotedPath)

			this.eventEmitter.emit('cycleQuoted', quotedPath)
		} catch (error) {
			this.telemetry.onErrorQuotePath(error, route)
		}
	}
}
