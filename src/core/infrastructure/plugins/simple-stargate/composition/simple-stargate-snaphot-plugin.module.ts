import { Module } from '@nestjs/common'
import { StargateModule } from '../../../layerzero-bridges/stargate/stargate.module'
import { SolanaEvmHelperModule } from '../../shared-helpers/chain-specific/solana-evm/solana-evm-helper.module'
import { SimpleStargateSnapshotPlugin } from '../simple-stargate-snapshot-plugin'

@Module({
	imports: [SolanaEvmHelperModule, StargateModule],
	providers: [SimpleStargateSnapshotPlugin],
	exports: [SimpleStargateSnapshotPlugin],
})
export class SimpleStargateSnapshotPluginModule {}
