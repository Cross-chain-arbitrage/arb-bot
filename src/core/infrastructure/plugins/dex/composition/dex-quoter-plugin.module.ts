import { Module } from '@nestjs/common'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { EvmUtilsModule } from '../../shared-utils/chain-specific/evm/evm-utils.module'
import { PriceOracleHelper } from '../../shared-utils/price-oracle-helper'
import { DexQuoterPlugin } from '../dex-quoter-plugin'

@Module({
	imports: [EvmModule, DexModule, EvmUtilsModule],
	providers: [PriceOracleHelper, DexQuoterPlugin],
	exports: [DexQuoterPlugin],
})
export class DexQuoterPluginModule {}
