import { Module } from '@nestjs/common'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { EvmHelperModule } from '../../shared-helpers/chain-specific/evm/evm-helper.module'
import { PriceOracleHelper } from '../../shared-helpers/price-oracle-helper'
import { DexQuoterPlugin } from '../dex-quoter-plugin'

@Module({
	imports: [EvmModule, DexModule, EvmHelperModule],
	providers: [PriceOracleHelper, DexQuoterPlugin],
	exports: [DexQuoterPlugin],
})
export class DexQuoterPluginModule {}
