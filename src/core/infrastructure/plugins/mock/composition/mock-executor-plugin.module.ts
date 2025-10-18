import { Module } from '@nestjs/common'
import { MockExecutorPlugin } from '../mock-executor-plugin'

@Module({
	providers: [MockExecutorPlugin],
	exports: [MockExecutorPlugin],
})
export class MockExecutorPluginModule {}
