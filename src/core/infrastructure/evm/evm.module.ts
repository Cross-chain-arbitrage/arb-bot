import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ChainClientModule } from './chain-client/chain-client.module'
import { EvmHelper } from './evm-helper'
import { GasPriceOracleService } from './gas-price-oracle/gas-price-oracle.service'
import { TokenUtils } from './primitives/tokens/TokenUtils'

@Module({
	imports: [ChainClientModule, CacheModule.register()],
	providers: [TokenUtils, GasPriceOracleService, EvmHelper],
	exports: [TokenUtils, GasPriceOracleService, ChainClientModule, EvmHelper],
})
export class EvmModule {}
