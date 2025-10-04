import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BalanceNotifier } from '../../../application/interfaces/balance-notifier'
import { NodeWithBalance } from '../../../application/interfaces/balance-oracle'
import { Token } from '../../../domain/entities/token'
import { ChainIdUtils } from '../../../domain/services/chain-id-utils'
import { TokenIdUtils } from '../../../domain/services/token-id-utils'
import { ChainId } from '../../../domain/value-objects/chain-id'
import { ChainClientService } from '../../evm/chain-client/chain-client.service'
import { TgNotifier } from '../tg-notifier'
import { MessageResponse } from '../types'

@Injectable()
export class TgBalancesNotifier implements BalanceNotifier {
	logger = new Logger(TgBalancesNotifier.name)
	private messageResponse: MessageResponse | undefined

	constructor(
		private readonly configService: ConfigService,
		private readonly chainClientService: ChainClientService,
		private readonly tgNotifier: TgNotifier,
	) {}

	notifyBalances(balances: NodeWithBalance<Token>[]): void {
		this.unsafeNotifyBalances(balances).catch((error) => {
			this.logger.error(`Failed to send/edit balance message`, error)
		})
	}

	async unsafeNotifyBalances(
		balances: NodeWithBalance<Token>[],
	): Promise<void> {
		const balancesByChain = this.groupBalancesByChain(balances)

		const message = this.buildBalanceReport(balancesByChain)

		await this.sendOrEditBalanceReport(message)
	}

	private buildBalanceReport(
		balancesByChain: Map<ChainId, Array<NodeWithBalance<Token>>>,
	) {
		let totalUsd = 0

		// Calculate total USD value
		for (const chainBalances of balancesByChain.values()) {
			totalUsd += chainBalances.reduce(
				(sum, item) => sum + item.usdValue,
				0,
			)
		}

		const botName =
			this.configService.get<string>('botName') ?? 'Unknown bot'

		// Build unified message
		let message =
			`<b>${botName}</b>\n` +
			`🕐 ${new Date().toLocaleString('ru', { timeZoneName: 'short' })}\n` +
			`💵 <b>Total Portfolio: $${totalUsd.toFixed(2)}</b>\n\n`

		for (const [chainId, chainBalances] of balancesByChain) {
			const chainName = this.getChainNameById(chainId)

			const chainTotal = chainBalances.reduce(
				(sum, item) => sum + item.usdValue,
				0,
			)

			message += `🔗 <b>${chainName}</b> - $${chainTotal.toFixed(2)}\n`

			// Sort tokens: native currencies first, then others in original order
			const nativeTokens = chainBalances.filter((item) => item.isNative)
			const nonNativeTokens = chainBalances.filter(
				(item) => !item.isNative,
			)
			const sortedTokens = [...nativeTokens, ...nonNativeTokens]

			for (const { node, balance, usdValue, isNative } of sortedTokens) {
				const balanceFormatted = node.formatUnits(balance)

				// Color coding for native currencies based on USD value
				let colorEmoji = ''
				if (isNative) {
					if (usdValue < 0.5) {
						colorEmoji = '🔴' // Red
					} else if (usdValue < 1.5) {
						colorEmoji = '🟡' // Yellow
					} else {
						colorEmoji = '🟢' // Green
					}
				}

				const nativeLabel = isNative ? `${colorEmoji}` : ''
				message += `  ${node.symbol}: ${Number(balanceFormatted).toFixed(4)} ($${usdValue.toFixed(2)}) ${nativeLabel}\n`
			}

			message += '\n'
		}

		return message
	}

	private groupBalancesByChain(balances: Array<NodeWithBalance<Token>>) {
		const balancesByChain = new Map<
			ChainId,
			Array<NodeWithBalance<Token>>
		>()

		for (const item of balances) {
			const { chainId } = TokenIdUtils.parseId(item.node.id)

			if (!balancesByChain.has(chainId)) {
				balancesByChain.set(chainId, [])
			}
			balancesByChain.get(chainId)!.push(item)
		}

		return balancesByChain
	}

	private async sendOrEditBalanceReport(message: string) {
		const existingMessage = this.messageResponse

		if (existingMessage) {
			await this.tgNotifier.editMessage(existingMessage, message)
		} else {
			// Send new message
			const newMessage = await this.tgNotifier.sendMessage(message)

			if (newMessage) {
				this.messageResponse = newMessage
			}
		}
	}

	private getChainNameById(chainId: ChainId) {
		const { namespace, reference } = ChainIdUtils.parseId(chainId)

		switch (namespace) {
			case 'eip155':
				return this.chainClientService.getChainNameById(
					Number(reference),
				)
			case 'solana':
				return 'Solana'
			default:
				return 'Unknown chain'
		}
	}
}
