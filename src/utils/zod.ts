import { z, ZodError } from 'zod'

/**
 * Description
 * @param name parameter description
 * @returns return description
 */
export function parsePretty<T>(scheme: z.ZodType<T>, raw: unknown) {
	try {
		return scheme.parse(raw)
	} catch (error) {
		if (error instanceof ZodError) {
			throw new Error(z.prettifyError(error))
		}

		throw error
	}
}
