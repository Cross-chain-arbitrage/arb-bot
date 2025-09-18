---
to: src/core/infrastructure/plugins/<%= h.changeCase.kebabCase(name) %>/composition/<%= h.changeCase.kebabCase(name) %>-snaphot-plugin.module.ts
---
import { Module } from '@nestjs/common'
import { <%= h.changeCase.pascalCase(name) %>SnapshotPlugin } from '../<%= h.changeCase.kebabCase(name) %>-snapshot-plugin'

@Module({
	imports: [],
	providers: [<%= h.changeCase.pascalCase(name) %>SnapshotPlugin],
	exports: [<%= h.changeCase.pascalCase(name) %>SnapshotPlugin],
})
export class <%= h.changeCase.pascalCase(name) %>SnapshotPluginModule {}
