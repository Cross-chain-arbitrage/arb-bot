import { Global, Module } from '@nestjs/common'
import { PRICE_ORACLE_TOKEN } from '../../application/interfaces/price-oracle'
import { ChainClientModule } from '../evm/chain-client/chain-client.module'
import { EvmModule } from '../evm/evm.module'
import { SolanaModule } from '../solana/solana.module'
import { GeckoTerminalService } from './gecko-terminal.service'
import { PriceOracleHelper } from './price-oracle-helper'
import { PriceOracleService } from './price-oracle.service'

@Global()
@Module({
	imports: [ChainClientModule, SolanaModule, EvmModule],
	providers: [
		GeckoTerminalService,
		PriceOracleService,
		PriceOracleHelper,
		{ provide: PRICE_ORACLE_TOKEN, useExisting: PriceOracleService },
	],
	exports: [PRICE_ORACLE_TOKEN, PriceOracleHelper],
})
export class PriceOracleModule {}
