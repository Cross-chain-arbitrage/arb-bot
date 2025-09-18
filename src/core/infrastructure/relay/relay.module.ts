import { Module } from '@nestjs/common'
import { EvmModule } from '../evm/evm.module'
import { SolanaModule } from '../solana/solana.module'
import { RelayApiService } from './relay-api.service'
import { RelayService } from './relay-service'

@Module({
	imports: [SolanaModule, EvmModule],
	providers: [RelayService, RelayApiService],
	exports: [RelayService, RelayApiService],
})
export class RelayModule {}
