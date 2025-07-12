---
to: src/dex/<%= h.changeCase.pascalCase(name) %>/periphery.ts
---
import { getAddress } from 'viem'

export const <%= h.changeCase.constantCase(name) %>_PERIPHERY: Record<
	number,
	{
		[factoryAddress: Address]: {
			router: Address
		}
	}
> = {
	[/* chainId */]: {
		[getAddress('/* factory address */')]: {
			router: '/* router address */',
		},
	},
}
