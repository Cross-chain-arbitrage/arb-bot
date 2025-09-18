import { Module } from '@nestjs/common'
import { FuseBridgeGraphPlugin } from '../fuse-bridge-graph-plugin'

@Module({
	imports: [],
	providers: [FuseBridgeGraphPlugin],
	exports: [FuseBridgeGraphPlugin],
})
export class FuseBridgeGraphPluginModule {}
