import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EdgeHandlerPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { ChainIdUtils } from '../../../domain/services/chain-id-utils'
import { ChannelIdUtils } from '../../../domain/services/channel-id-utils'
import { EdgeIdUtils } from '../../../domain/services/edge-id-utils'
import { TokenIdUtils } from '../../../domain/services/token-id-utils'
import { Pool } from '../../dex/base/pool'
import { DexRegistry } from '../../dex/dex-registry'
import { PoolType, PoolUtils } from '../../dex/pool-utils'
import { Token } from '../../evm/primitives/tokens/Token'

@Injectable()
export class DexPlugin implements EdgeHandlerPlugin {
	constructor(
		readonly poolUtils: PoolUtils,
		readonly configService: ConfigService,
	) {}

	async canHandle(edge: Edge<Token>): Promise<boolean> {
		const { channelId } = EdgeIdUtils.parseId(edge.id)
		const { protocol } = ChannelIdUtils.parseId(channelId)

		if (
			!Object.keys(DexRegistry)
				.map((key) => key.toLowerCase())
				.includes(protocol.toLowerCase())
		)
			return false

		try {
			await this.getPool(edge)

			return true
		} catch {
			return false
		}
	}

	async getPool(edge: Edge<Token>): Promise<Pool> {
		const { channelId } = EdgeIdUtils.parseId(edge.id)
		const { protocol, instance } = ChannelIdUtils.parseId(channelId)
		const { chainId: caip2ChainId } = TokenIdUtils.parseId(edge.from.id)
		const { reference } = ChainIdUtils.parseId(caip2ChainId)

		const chainId = Number(reference)

		const pool = await this.poolUtils.createPool(
			instance as Address,
			chainId,
			protocol as PoolType,
		)

		return pool
	}
}
