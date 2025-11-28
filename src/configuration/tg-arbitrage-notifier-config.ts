import { z } from 'zod'
import { TgNotifierConfig } from '../core/infrastructure/tg-notifier/types'

export const tgArbitrageNotifierConfigSchema: z.ZodType<TgNotifierConfig> =
	z.object({
		botName: z.string(),
	})
