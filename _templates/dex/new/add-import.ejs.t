---
to: src/dex/poolVariety.ts
inject: true
after: "import { UniV3PoolCreator } from './UniV3/PoolCreator'"
---
import { <%= h.changeCase.pascalCase(name) %>PoolCreator } from './<%= h.changeCase.pascalCase(name) %>/PoolCreator'