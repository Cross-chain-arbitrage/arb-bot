import { Logger, Module } from '@nestjs/common'
import { TokenUtils } from '../evm/primitives/tokens/TokenUtils'
import { SolanaTokenUtils } from '../solana/solana-tokens/solana-token-utils'
import { GeckoTerminalService } from './gecko-terminal.service'
import { PriceOracleService } from './price-oracle.service'

@Module({
	imports: [],
	providers: [
		SolanaTokenUtils,
		PriceOracleService,
		GeckoTerminalService,
		TokenUtils,
		Logger,
	],
	exports: [PriceOracleService],
})
export class PriceOracleModule {}
