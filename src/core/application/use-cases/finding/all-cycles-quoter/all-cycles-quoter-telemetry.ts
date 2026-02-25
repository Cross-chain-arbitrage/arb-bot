import { Injectable, Logger } from '@nestjs/common'
import { Edge } from '../../../../domain/entities/edge'
import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'

@Injectable()
export class AllCyclesQuoterTelemetry {
	logger = new Logger(AllCyclesQuoterTelemetry.name)

	onErrorQuotePath(error: unknown, route: Edge[]) {
		this.logger.error(
			{ err: error, route: route.map((edge) => edge.id) },
			`quote path failed`,
		)
	}

	//TODO: consider global log rules to not print methods of class
	onQuotePath(quotedPath: QuotedPath<Token>) {
		const { startAmount, endAmount, quotedStepSequence } = quotedPath
		this.logger.log({
			startAmount,
			endAmount,
			quotedStepSequence: quotedStepSequence.map((step) => {
				return {
					quote: step.quote,
					edge: {
						from: {
							symbol: step.edge.from.symbol,
							id: step.edge.from.id,
						},
						to: {
							symbol: step.edge.to.symbol,
							id: step.edge.to.id,
						},
						id: step.edge.id,
					},
				}
			}),
		})
	}
}
