---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/<%= h.changeCase.kebabCase(name) %>-plugin.ts
---
import { Plugin } from '../../../application/interfaces/graph-plugin'

export class <%= h.changeCase.pascalCase(name) %>Plugin implements Plugin {
	id = '<%= h.changeCase.kebabCase(name) %>'
} 