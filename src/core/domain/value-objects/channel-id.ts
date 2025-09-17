import { z } from 'zod'

/**
 * Protocol that powers the edge functionality, e.g. stargate, relay, etc.
 */
const protocolPattern = '[^\\s]+'

/**
 * Instance identifier that specifies a protocol instance, e.g. "default" in Stargate, pool address in DEX
 */
const instancePattern = '[^\\s]+'

export const channelScheme = z
	.string()
	.regex(new RegExp(`^${protocolPattern}:${instancePattern}$`))

type Protocol = string
type Instance = string

export type ChannelId = `${Protocol}:${Instance}`
