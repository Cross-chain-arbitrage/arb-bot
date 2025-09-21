import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Chain, defineChain } from 'viem'
import { privateKeyToAddress } from 'viem/accounts'
import { z } from 'zod'
import { getAlchemyRpcUrl } from './alchemy-utils'
import { CHAIN_CLIENT_CONFIG_KEY } from './configuration/chain-client-config'
import { ChainClientConfig, CustomChain, RpcSettings, RpcUrl } from './types'

@Injectable()
export class ChainClientConfigService {
	privateKey!: Hex
	rpcSettings?: Record<
		number,
		{ rpcUrls: RpcUrl[]; disableDefaultRpcUrl: boolean } | undefined
	>
	customChains?: Chain[]

	constructor(private readonly configService: ConfigService) {
		console.log('ChainClientConfigService constructor')
		const config = this.configService.get<ChainClientConfig>(
			CHAIN_CLIENT_CONFIG_KEY,
		)

		this.privateKey = this.getPrivateKey()

		if (config?.rpcSettings)
			this.rpcSettings = this.transformRpcProviders(config?.rpcSettings)

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

	private transformRpcProviders(rpcProviders: RpcSettings) {
		const rpcUrls: Record<
			number,
			{ rpcUrls: RpcUrl[]; disableDefaultRpcUrl: boolean }
		> = {}

		for (const [chainId, urls] of Object.entries(rpcProviders)) {
			rpcUrls[Number(chainId)] = {
				rpcUrls: [],
				disableDefaultRpcUrl: false,
			}

			urls.rpcUrls.forEach((initialUrl) => {
				let rpcUrl = initialUrl

				if (initialUrl === 'alchemy') {
					rpcUrl = getAlchemyRpcUrl(Number(chainId))
				}

				const validatedUrl = z.url().parse(rpcUrl)

				rpcUrls[Number(chainId)].rpcUrls.push(validatedUrl as RpcUrl)
			})

			rpcUrls[Number(chainId)].disableDefaultRpcUrl =
				urls.disableDefaultRpcUrl
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
