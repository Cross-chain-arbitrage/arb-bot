import { Module } from '@nestjs/common'
import { SolanaClientService } from './solana-client.service'
import { SolanaTokenUtils } from './solana-tokens/solana-token-utils'

@Module({
	imports: [],
	providers: [SolanaTokenUtils, SolanaClientService],
	exports: [SolanaTokenUtils, SolanaClientService],
})
export class SolanaModule {}
