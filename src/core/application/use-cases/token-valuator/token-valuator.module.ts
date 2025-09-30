import { Global, Module } from '@nestjs/common'
import { TokenValuator } from './token-valuator'

@Global()
@Module({
	imports: [],
	providers: [TokenValuator],
	exports: [TokenValuator],
})
export class TokenValuatorModule {}
