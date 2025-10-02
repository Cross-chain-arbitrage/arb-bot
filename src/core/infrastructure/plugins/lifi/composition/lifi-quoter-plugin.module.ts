import { Module } from '@nestjs/common'
import { LifiModule } from '../../../lifi/lifi.module'
import { LifiQuoterPlugin } from '../lifi-quoter-plugin'

@Module({
	imports: [LifiModule],
	providers: [LifiQuoterPlugin],
	exports: [LifiQuoterPlugin],
})
export class LifiQuoterPluginModule {}
