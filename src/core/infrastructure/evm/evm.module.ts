import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ChainClientModule } from './chain-client/chain-client.module'
import { GasPriceOracleService } from './gas-price-oracle/gas-price-oracle.service'
import { TokenUtils } from './primitives/tokens/TokenUtils'

@Module({
	imports: [ChainClientModule, CacheModule.register()],
	providers: [TokenUtils, GasPriceOracleService],
	exports: [TokenUtils, GasPriceOracleService, ChainClientModule],
})
export class EvmModule {}
