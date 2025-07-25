import { Module } from '@nestjs/common'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ChainClientService } from '../../utils/ChainClientService'
import { GeckoTerminalService } from './gecko-terminal.service'
import { PriceOracleService } from './price-oracle.service'

@Module({
	providers: [
		PriceOracleService,
		GeckoTerminalService,
		TokenUtils,
		ChainClientService,
	],
	exports: [PriceOracleService],
})
export class PriceOracleModule {}
