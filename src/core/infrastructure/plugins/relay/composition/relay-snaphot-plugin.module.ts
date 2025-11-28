import { Module } from '@nestjs/common'
import { TokenValuatorModule } from '../../../../application/use-cases/token-valuator/token-valuator.module'
import { RelayModule } from '../../../relay/relay.module'
import { SolanaEvmHelperModule } from '../../shared/helpers/chain-specific/solana-evm/solana-evm-helper.module'
import { RelaySnapshotPlugin } from '../relay-snapshot-plugin'

@Module({
	imports: [TokenValuatorModule, SolanaEvmHelperModule, RelayModule],
	providers: [RelaySnapshotPlugin],
	exports: [RelaySnapshotPlugin],
})
export class RelaySnapshotPluginModule {}
