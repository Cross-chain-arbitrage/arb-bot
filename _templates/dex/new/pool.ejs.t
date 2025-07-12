---
to: src/dex/<%= h.changeCase.pascalCase(name) %>/Pool.ts
---
import { Pool, PoolConstructorParams } from '../base/Pool'

export class <%= h.changeCase.pascalCase(name) %>Pool extends Pool {
	constructor(params: Omit<PoolConstructorParams, 'poolAbi'>) {
		super({
			...params,
			poolAbi: [], // TODO: Add ABI
		})
	}

	// TODO: Implement abstract methods, IDE can fill them if you click on class declaration
}