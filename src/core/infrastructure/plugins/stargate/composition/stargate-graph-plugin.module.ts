import { Module } from '@nestjs/common'
import { StargateModule } from '../../../layerzero-bridges/stargate/stargate.module'
import { StargateGraphPlugin } from '../stargate-graph-plugin'

@Module({
	imports: [StargateModule],
	providers: [StargateGraphPlugin],
	exports: [StargateGraphPlugin],
})
export class StargateGraphPluginModule {}
