import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Chain, defineChain } from 'viem'
import { privateKeyToAddress } from 'viem/accounts'
import { z } from 'zod'
import { getAlchemyRpcUrl } from '../../../../utils/alchemy'
import { CHAIN_CLIENT_CONFIG_KEY } from './configuration/chain-client-config'
import { ChainClientConfig, CustomChain, RpcProviders, RpcUrl } from './types'

@Injectable()
export class ChainClientConfigService implements OnModuleInit {
	privateKey!: Hex
	rpcUrls: Record<number, RpcUrl[]> | undefined
	customChains: Chain[] | undefined

	constructor(private readonly configService: ConfigService) {}

	onModuleInit() {
		const config = this.configService.get<ChainClientConfig>(
			CHAIN_CLIENT_CONFIG_KEY,
		)

		this.privateKey = this.getPrivateKey()

		if (config?.rpcProviders)
			this.rpcUrls = this.transformRpcProviders(config?.rpcProviders)

		if (config?.customChains)
			this.customChains = this.transformCustomChains(config?.customChains)
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

	private transformRpcProviders(rpcProviders: RpcProviders) {
		const rpcUrls: Record<number, RpcUrl[]> = {}

		for (const [chainId, urls] of Object.entries(rpcProviders)) {
			rpcUrls[Number(chainId)] = []

			urls.forEach((initialUrl) => {
				let rpcUrl = initialUrl

				if (initialUrl === 'alchemy') {
					rpcUrl = getAlchemyRpcUrl(Number(chainId))
				}

				const validatedUrl = z.url().parse(rpcUrl)

				rpcUrls[Number(chainId)].push(validatedUrl as RpcUrl)
			})
		}

		return rpcUrls
	}

	private transformCustomChains(customChains: CustomChain[]): Chain[] {
		return customChains.map((customChain) =>
			defineChain({
				id: customChain.chainId,
				rpcUrls: { default: { http: [customChain.defaultRpcUrl] } },
				name: customChain.chainName,
				nativeCurrency: customChain.nativeCurrency,
			}),
		)
	}
}
