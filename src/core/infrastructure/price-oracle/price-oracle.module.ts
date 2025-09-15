import { Global, Module } from '@nestjs/common'
import { PRICE_ORACLE_TOKEN } from '../../application/interfaces/price-oracle'
import { ChainClientConfigService } from '../evm/chain-client/chain-client-config.service'
import { ChainClientService } from '../evm/chain-client/chain-client.service'
import { TokenUtils } from '../evm/primitives/tokens/TokenUtils'
import { SolanaClientService } from '../solana/solana-client.service'
import { SolanaTokenUtils } from '../solana/solana-tokens/solana-token-utils'
import { GeckoTerminalService } from './gecko-terminal.service'
import { PriceOracleHelper } from './price-oracle-helper'
import { PriceOracleService } from './price-oracle.service'

@Global()
@Module({
	imports: [],
	providers: [
		ChainClientService,
		SolanaClientService,
		SolanaTokenUtils,
		GeckoTerminalService,
		TokenUtils,
		PriceOracleService,
		ChainClientConfigService,
		PriceOracleHelper,
		{ provide: PRICE_ORACLE_TOKEN, useExisting: PriceOracleService },
	],
	exports: [PRICE_ORACLE_TOKEN],
})
export class PriceOracleModule {}
