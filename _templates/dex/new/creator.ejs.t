---
to: src/dex/<%= h.changeCase.pascalCase(name) %>/PoolCreator.ts
---
import { PoolCreator } from '../base/PoolCreator'
import { <%= h.changeCase.pascalCase(name) %>Pool } from './Pool'
import { <%= h.changeCase.constantCase(name) %>_PERIPHERY } from './periphery'

export class <%= h.changeCase.pascalCase(name) %>PoolCreator extends PoolCreator {
	// TODO: Implement abstract methods, IDE can fill them if you click on class declaration
}