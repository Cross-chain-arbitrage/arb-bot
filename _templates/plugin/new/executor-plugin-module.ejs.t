---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/composition/<%= h.changeCase.kebabCase(name) %>-executor-plugin.module.ts
---
import { Module } from '@nestjs/common'
import { <%= h.changeCase.pascalCase(name) %>ExecutorPlugin } from '../<%= h.changeCase.kebabCase(name) %>-executor-plugin'

@Module({
	imports: [],
	providers: [<%= h.changeCase.pascalCase(name) %>ExecutorPlugin],
	exports: [<%= h.changeCase.pascalCase(name) %>ExecutorPlugin],
})
export class <%= h.changeCase.pascalCase(name) %>ExecutorPluginModule {}
