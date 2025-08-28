import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EdgeHandlerPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { ChannelIdUtils } from '../../../domain/services/channel-id-utils'
import { EdgeIdUtils } from '../../../domain/services/edge-id-utils'
import { TokenIdUtils } from '../../../domain/services/token-id-utils'
import { Pool } from '../../dex/base/pool'
import { PoolType, PoolUtils } from '../../dex/pool-utils'

@Injectable()
export class DexPlugin implements EdgeHandlerPlugin {
	constructor(
		readonly poolUtils: PoolUtils,
		readonly configService: ConfigService,
	) {}

	async canHandle(edge: Edge): Promise<boolean> {
		try {
			await this.getPool(edge)

			return true
		} catch (error) {
			console.log(error)
			return false
		}
	}

	async getPool(edge: Edge): Promise<Pool> {
		const { channelId } = EdgeIdUtils.parseId(edge.id)
		const { protocol, instance } = ChannelIdUtils.parseId(channelId)
		const { reference } = TokenIdUtils.parseId(edge.from.id)

		const chainId = Number(reference)

		const pool = await this.poolUtils.createPool(
			instance as Address,
			chainId,
			protocol as PoolType,
		)

		return pool
	}
}
