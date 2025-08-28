import z from 'zod'

const namespacePattern = '[-a-z0-9]{3,8}'
const referencePattern = '[-_a-zA-Z0-9]{1,32}'
const accountPattern = '[-.%a-zA-Z0-9]{1,128}'

const tokenIdRegex = new RegExp(
	`^${namespacePattern}:${referencePattern}:${accountPattern}$`,
)

export const tokenIdScheme = z.string().regex(tokenIdRegex)

/**
 * implements https://chainagnostic.org/CAIPs/caip-10
 */
export type TokenId = z.infer<typeof tokenIdScheme>
