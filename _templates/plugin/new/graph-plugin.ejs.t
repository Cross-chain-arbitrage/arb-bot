---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/<%= h.changeCase.kebabCase(name) %>-graph-plugin.ts
---
import { GraphBuilderPlugin } from '../../../application/interfaces/graph-plugin'

export class <%= h.changeCase.pascalCase(name) %>GraphPlugin implements GraphBuilderPlugin {
	name = '<%= h.changeCase.kebabCase(name) %>'
} 