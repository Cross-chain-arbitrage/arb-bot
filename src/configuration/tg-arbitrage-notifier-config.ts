import { z } from 'zod'
import { TgNotifierConfig } from '../core/infrastructure/tg-notifier/types'

export const tgArbitrageNotifierConfigScheme: z.ZodType<TgNotifierConfig> =
	z.object({
		botName: z.string(),
	})
