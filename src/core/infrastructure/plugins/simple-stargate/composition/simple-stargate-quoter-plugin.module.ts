import { Module } from '@nestjs/common'
import { StargateModule } from '../../../layerzero-bridges/stargate/stargate.module'
import { SolanaEvmHelperModule } from '../../shared/helpers/chain-specific/solana-evm/solana-evm-helper.module'
import { SimpleStargateQuoterPlugin } from '../simple-stargate-quoter-plugin'

@Module({
	imports: [SolanaEvmHelperModule, StargateModule],
	providers: [SimpleStargateQuoterPlugin],
	exports: [SimpleStargateQuoterPlugin],
})
export class SimpleStargateQuoterPluginModule {}
