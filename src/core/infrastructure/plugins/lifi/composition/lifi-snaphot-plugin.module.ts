import { Module } from '@nestjs/common'
import { LifiModule } from '../../../lifi/lifi.module'
import { InterpolationModule } from '../../shared/helpers/interpolation/interpolation.module'
import { LifiSnapshotPlugin } from '../lifi-snapshot-plugin'

@Module({
	imports: [LifiModule, InterpolationModule],
	providers: [LifiSnapshotPlugin],
	exports: [LifiSnapshotPlugin],
})
export class LifiSnapshotPluginModule {}
