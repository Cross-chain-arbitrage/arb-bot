import { Module } from '@nestjs/common'
import { MockSnapshotPlugin } from '../mock-snapshot-plugin'

@Module({
	providers: [MockSnapshotPlugin],
	exports: [MockSnapshotPlugin],
})
export class MockSnapshotPluginModule {}
