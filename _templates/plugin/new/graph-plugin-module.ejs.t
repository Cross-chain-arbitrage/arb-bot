---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/composition/<%= h.changeCase.kebabCase(name) %>-graph-plugin.module.ts
---
import { Module } from '@nestjs/common'
import { <%= h.changeCase.pascalCase(name) %>GraphPlugin } from '../<%= h.changeCase.kebabCase(name) %>-graph-plugin'

@Module({
	imports: [],
	providers: [<%= h.changeCase.pascalCase(name) %>GraphPlugin],
	exports: [<%= h.changeCase.pascalCase(name) %>GraphPlugin],
})
export class <%= h.changeCase.pascalCase(name) %>GraphPluginModule {}
