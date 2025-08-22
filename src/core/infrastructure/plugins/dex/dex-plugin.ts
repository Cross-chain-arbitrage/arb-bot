import { Injectable } from '@nestjs/common/decorators/core/injectable.decorator'
import { Plugin } from '../../../application/interfaces/graph-plugin'

@Injectable()
export class DexPlugin implements Plugin {
	overriddenId: string | undefined

	get id(): string {
		if (!this.overriddenId) {
			throw new Error('DexPlugin id is not set')
		}

		return this.overriddenId
	}
}
