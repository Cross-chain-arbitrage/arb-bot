import { Logger, Module } from '@nestjs/common'
import { ChainClientService } from '../../chain-client/chain-client.service'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { GeckoTerminalService } from './gecko-terminal.service'
import { PriceOracleService } from './price-oracle.service'

@Module({
	providers: [
		PriceOracleService,
		GeckoTerminalService,
		TokenUtils,
		ChainClientService,
		Logger,
	],
	exports: [PriceOracleService],
})
export class PriceOracleModule {}
