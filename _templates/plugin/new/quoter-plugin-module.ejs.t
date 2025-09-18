---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/composition/<%= h.changeCase.kebabCase(name) %>-quoter-plugin.module.ts
---
import { Module } from '@nestjs/common'
import { <%= h.changeCase.pascalCase(name) %>QuoterPlugin } from '../<%= h.changeCase.kebabCase(name) %>-quoter-plugin'

@Module({
	imports: [],
	providers: [<%= h.changeCase.pascalCase(name) %>QuoterPlugin],
	exports: [<%= h.changeCase.pascalCase(name) %>QuoterPlugin],
})
export class <%= h.changeCase.pascalCase(name) %>QuoterPluginModule {}
