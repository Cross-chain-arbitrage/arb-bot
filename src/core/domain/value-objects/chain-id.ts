import z from 'zod'

const namespacePattern = '[-a-z0-9]{3,32}'
const referencePattern = '[-_a-zA-Z0-9]{1,32}'

const chainIdRegex = new RegExp(`^${namespacePattern}:${referencePattern}$`)

export const chainIdSchema = z
	.string()
	.regex(chainIdRegex) as z.ZodType<ChainId>

type Namespace = string
type Reference = string

/**
 * implements https://chainagnostic.org/CAIPs/caip-2
 */
export type ChainId = `${Namespace}:${Reference}`
