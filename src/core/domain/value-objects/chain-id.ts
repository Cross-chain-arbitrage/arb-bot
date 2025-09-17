import z from 'zod'

const namespacePattern = '[-a-z0-9]{3,8}'
const referencePattern = '[-_a-zA-Z0-9]{1,32}'

const chainIdRegex = new RegExp(`^${namespacePattern}:${referencePattern}$`)

export const chainIdScheme = z.string().regex(chainIdRegex)

type Namespace = string
type Reference = string

/**
 * implements https://chainagnostic.org/CAIPs/caip-2
 */
export type ChainId = `${Namespace}:${Reference}`
