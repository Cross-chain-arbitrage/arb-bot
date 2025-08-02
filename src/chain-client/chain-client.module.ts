import { Module } from '@nestjs/common'
import { ChainClientConfigService } from './chain-client.config'
import { ChainClientService } from './chain-client.service'

@Module({
	providers: [ChainClientConfigService, ChainClientService],
	exports: [ChainClientService],
})
export class ChainClientModule {}
