import { Module } from '@nestjs/common'
import { MockQuoterPlugin } from '../mock-quoter-plugin'

@Module({
	providers: [MockQuoterPlugin],
	exports: [MockQuoterPlugin],
})
export class MockQuoterPluginModule {}
