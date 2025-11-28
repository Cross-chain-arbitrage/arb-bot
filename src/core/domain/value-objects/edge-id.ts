import { z } from 'zod'
import { NodeId } from '../entities/node'
import { ChannelId } from './channel-id'

const anyStringPattern = '[^\\s]+'

const channelIdPattern = anyStringPattern
const fromNodeIdPattern = anyStringPattern
const toNodeIdPattern = anyStringPattern

export const edgeIdSchema = z
	.string()
	.regex(
		new RegExp(
			`^${channelIdPattern}::${fromNodeIdPattern}::${toNodeIdPattern}$`,
		),
	)

export type EdgeId = `${ChannelId}::${NodeId}::${NodeId}`
