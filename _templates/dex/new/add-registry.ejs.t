---
to: src/dex/poolVariety.ts
inject: true
after: "export const DexRegistry = {"
---
	<%= h.changeCase.constantCase(name) %>: new <%= h.changeCase.pascalCase(name) %>PoolCreator(),