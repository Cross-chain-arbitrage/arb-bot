import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Chain, defineChain } from 'viem'
import { privateKeyToAddress } from 'viem/accounts'
import { z } from 'zod'
import { getAlchemyRpcUrl } from '../utils/alchemy'
import { parsePretty } from '../utils/zod'

function transformAndValidate(rawChains: Record<string, string[]>) {
	const chains: Record<string, string[]> = {}

	for (const [chainId, urls] of Object.entries(rawChains)) {
		chains[chainId] = []

		urls.forEach((initialUrl) => {
			let rpcUrl = initialUrl

			if (initialUrl === 'alchemy') {
				rpcUrl = getAlchemyRpcUrl(Number(chainId))
			}

			const validatedUrl = z.url().parse(rpcUrl)

			chains[chainId].push(validatedUrl.toString())
		})
	}

	return chains
}

const rpcProvidersScheme = z
	.record(z.string(), z.array(z.string()))
	.transform(transformAndValidate)

const customChainsScheme = z.array(
	z
		.object({
			chainId: z.number(),
			defaultRpcUrl: z.url(),
			chainName: z.string(),
			nativeCurrency: z.object({
				name: z.string(),
				symbol: z.string(),
				decimals: z.number(),
			}),
		})
		.transform(({ chainId, defaultRpcUrl, chainName, nativeCurrency }) =>
			defineChain({
				id: chainId,
				rpcUrls: { default: { http: [defaultRpcUrl] } },
				name: chainName,
				nativeCurrency,
			}),
		),
)

const chainClientConfigScheme = z
	.object({
		rpcProviders: rpcProvidersScheme.optional(),
		customChains: customChainsScheme.optional(),
	})
	.optional()

@Injectable()
export class ChainClientConfigService implements OnModuleInit {
	privateKey!: Hex
	rpcUrls: Record<number, string[]> | undefined
	customChains: Chain[] | undefined

	constructor(private readonly configService: ConfigService) {}

	public onModuleInit(): void {
		const chainConfigRaw = this.configService.get('chainClientConfig')

		const chainConfig = parsePretty(chainClientConfigScheme, chainConfigRaw)

		this.privateKey = this.getPrivateKey()

		this.rpcUrls = chainConfig?.rpcProviders

		this.customChains = chainConfig?.customChains
	}

	private getPrivateKey(): Hex {
		const privateKey = process.env[`PRIVATE_KEY`] as Hex

		if (!privateKey) {
			throw new Error(`Private key not found`)
		}

		//viem validate pk
		privateKeyToAddress(privateKey)

		return privateKey
	}
}
