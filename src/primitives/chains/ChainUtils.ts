import { ClientManager } from '../../utils/ClientManager'

export class ChainUtils {
	static getChainNameById(id: number): string {
		const fullName = ClientManager.findChainById(id).name
		const keywords = ['Mainnet']

		const nameWithoutKeywords = keywords
			.reduce((acc, keyword) => {
				return acc.replace(keyword, '')
			}, fullName)
			.trim()
		return nameWithoutKeywords
	}
}
