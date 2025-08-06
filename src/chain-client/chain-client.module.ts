import { DynamicModule, Global, Module } from '@nestjs/common'
import {
	CHAIN_CLIENT_CONFIG,
	ChainClientConfig,
	ChainClientConfigService,
} from './chain-client-config.service'
import { ChainClientService } from './chain-client.service'

@Global()
@Module({})
export class ChainClientModule {
	static forRoot(config?: ChainClientConfig): DynamicModule {
		return {
			module: ChainClientModule,
			providers: [
				{
					provide: CHAIN_CLIENT_CONFIG,
					useValue: config,
				},
				ChainClientConfigService,
				ChainClientService,
			],
			exports: [ChainClientService],
		}
	}
}
