import { Injectable, Logger } from '@nestjs/common'
import { Edge } from '../../../../domain/entities/edge'
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

	onQuotePath(quotedPath: QuotedPath) {
		this.logger.log(quotedPath)
	}
}
