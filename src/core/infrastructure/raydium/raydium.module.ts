import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { SolanaModule } from '../solana/solana.module'
import { RaydiumService } from './raydium.service'

@Module({
	imports: [CacheModule.register(), SolanaModule],
	providers: [RaydiumService],
	exports: [RaydiumService],
})
export class RaydiumModule {}
