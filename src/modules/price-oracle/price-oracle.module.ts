import { Module } from '@nestjs/common'
import { GeckoTerminalService } from './gecko-terminal.service'
import { PriceOracleService } from './price-oracle.service'

@Module({
	providers: [PriceOracleService, GeckoTerminalService],
	exports: [PriceOracleService],
})
export class PriceOracleModule {}
