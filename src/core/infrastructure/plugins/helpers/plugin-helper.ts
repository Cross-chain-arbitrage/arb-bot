import { Injectable } from '@nestjs/common'
import { Node } from '../../../domain/entities/node'

@Injectable()
export class PluginHelper {
	generateEdgeId(pluginName: string, from: Node, to: Node) {
		return `${from.id}-${to.id}-${pluginName}`
	}

	calcRate(amountIn: bigint, amountOut: bigint) {
		return -Math.log(Number(amountOut) / Number(amountIn))
	}
}
