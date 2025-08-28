import { z } from 'zod'

const anyStringPattern = '[^\\s]+'

const channelIdPattern = anyStringPattern
const fromNodeIdPattern = anyStringPattern
const toNodeIdPattern = anyStringPattern

export const edgeIdScheme = z
	.string()
	.regex(
		new RegExp(
			`^${channelIdPattern}::${fromNodeIdPattern}::${toNodeIdPattern}$`,
		),
	)

export type EdgeId = z.infer<typeof edgeIdScheme>
