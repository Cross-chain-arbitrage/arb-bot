import { Logger, Module } from '@nestjs/common'
import { ChainClientModule } from '../../chain-client/chain-client.module'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { GeckoTerminalService } from './gecko-terminal.service'
import { PriceOracleService } from './price-oracle.service'

@Module({
	imports: [ChainClientModule],
	providers: [PriceOracleService, GeckoTerminalService, TokenUtils, Logger],
	exports: [PriceOracleService],
})
export class PriceOracleModule {}
