import { Module } from '@nestjs/common'
import { SolanaModule } from '../solana/solana.module'
import { JupiterService } from './jupiter.service'

@Module({
	imports: [SolanaModule],
	providers: [JupiterService],
	exports: [JupiterService],
})
export class JupiterModule {}
