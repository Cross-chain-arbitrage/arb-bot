import { GeckoTerminalAPI } from '../../src/dataApi/geckoterminal/GeckoTerminalAPI'
import { makeSuite } from '../testUtils/makeSuite'

const ethTokens = [
	'0x98931a97a62ff3a8e2b42b7ea186cff193c2a67f',
	'0x4a35feae3378298d65f123576c61acd62b52a920',
	'0x883f46033947b92df4140b37386725d6e3faa69a',
	'0x58da573e3ea7ad64908bc8adcf2d4b0a16767c94',
	'0x88252715cf1f56201d397b65c75db1e1705a0a79',
	'0xbbbb3fd57b67a95788947d3ab4ebdf8d3e7f00cc',
	'0x7ebab7190d3d574ce82d29f2fa1422f18e29969c',
	'0x569dd3298e114da858415ee5672c8f2ab57938bf',
	'0x33b481cbbf3c24f2b3184ee7cb02daad1c4f49a8',
	'0x1e8e148055cbd5a02ea75eed79da7ce4b91108b9',
	'0x8e7a9f9817ecf2649c0316b22fea274d522c7b9b',
	'0x0007efdf427313313c904ad88cba4d00a672e327',
	'0xfa70f9870baf99fc5265079108ef2884059c46c7',
	'0x40d09d1c989fcb3a68623fe1c1acb3b769e0d237',
	'0xcf5104d094e3864cfcbda43b82e1cefd26a016eb',
	'0xaea46a60368a7bd060eec7df8cba43b7ef41ad85',
	'0xc9b53ab2679f573e480d01e0f49e2b5cfb7a3eab',
	'0x149af500734056b98572b66e6c771e57408e12e4',
	'0x19640000000ba88d36206beb10d0e86011c8d08c',
	'0x590f820444fa3638e022776752c5eef34e2f89a6',
	'0xd0ec028a3d21533fdd200838f39c85b03679285d',
	'0x9469d013805bffb7d3debe5e7839237e535ec483',
	'0xaa7a9ca87d3694b5755f213b5d04094b8d0f0a6f',
	'0xe0b7ad7f8f26e2b00c8b47b5df370f15f90fcf48',
	'0x38342f9c040e8b9291886e3df9ce8e7c88cf1948',
	'0x0202cdc995a607f23005f38fec256bc7acdf0e22',
	'0xebd3f05f77c456d59852da12ac764dc975eca91b',
	'0xa593decc9100f0014ff8ee07735f7b8eefb7e055',
	'0x20e8ca762e73ef68237df422bb952e12feb1e980',
	'0x9f277edfc463ebaa3d2a6274b01177697e910391',
	'0x0fc2a55d5bd13033f1ee0cdd11f60f7efe66f467',
	'0x6748cde4ebabdba761e67172415d72b499d1d75b',
	'0x110c44bb14408a2f008a67ed3398191b64c31247',
	'0xc114d80a2a188f30400b3cd545c5e296f0b04c3f',
	'0xf4c0efc13ea4221ad8278fb53727015471dce938',
	'0x8e2557f09af4a44779499bf7559720464febdde4',
	'0x8c19f7854b27758ddffdcdc8908f22bf55e00736',
	'0x6dacc889dbd5882cd5cf2b07ad71d659b2af4040',
	'0xa7320588e832c78e90973ddc44fbf97430fa1258',
	'0xdd549c97c4eeb84ef9c4deab2f28a13941eba6eb',
	'0x3db228fe836d99ccb25ec4dfdc80ed6d2cddcb4b',
	'0x41e5560054824ea6b0732e656e3ad64e20e94e45',
	'0xfdffb411c4a70aa7c95d5c981a6fb4da867e1111',
	'0x4ba765ee44597d4986c3fbe9eab1535de3b3c3b6',
	'0x7282b762a933de05a0406c6e513680ff712bdffa',
	'0x962c1c2c3ca89430a42e2008f5a358be34cea1f3',
	'0x96665680f4889891f3209713cb9a8205dce7278d',
	'0x52dd39e5d1a5f4b8a622466bbe880b5427bf038e',
	'0xebf231271b99f9f7f0738dae8ffdb2c245e2f3dc',
	'0xe6f98920852a360497dbcc8ec895f1bb1f7c8df4',
	'0x78d11e37e890af4589fc9d0f6f884fd165c5aa0a',
	'0xfe3e6a25e6b192a42a44ecddcd13796471735acf',
	'0xe533c2480983e46664b15717d6fc02c0a1dad537',
	'0x61c8e619ae7c8cbefbcceb9fb718135afb5d0d93',
	'0x2e8fafaf34f610af898d6a5eabcad82417c56ed9',
	'0x00000000efe302beaa2b3e6e1b18d08d69a9012a',
	'0x6c3fe25a4de7fa243c653cfe1f165bf11d99704e',
	'0x0883ea1df0e3a5630be9aedad4f2c1e2d0182593',
	'0x3d162937217758225776937d713ffb2f81a0c147',
	'0x767a98a4f0ac1d1c09e93e97c752f357b8f86976',
	'0x926759a8eaecfadb5d8bdc7a9c7b193c5085f507',
	'0x7528bd0f620d1568c307cc8d5db481a29e8d4e37',
	'0x93aa0ccd1e5628d3a841c4dbdf602d9eb04085d6',
	'0x4a467232abe1472f9abeb49dcd2b34590222cae9',
	'0xfcdf7cd90c6b0b7eef9767ea67b4129742bfd295',
	'0x75b45b0fd4a33ff3db856b24bf9c2c13f48e8eaf',
	'0x883c78a2c05fcd833e513499cb2a260562273ee4',
	'0x25ed873e64edc5d9769e2037f7098c110efd6111',
	'0xce14e4c778bd71645adaef1e54342f75355602bf',
	'0xd30e5c58c01cc0ec828051664e45f51f38c27b11',
	'0x745407c86df8db893011912d3ab28e68b62e49b0',
	'0x73414fb788f8a98e099f3642c94747d69e35201c',
	'0x603f0669ea8e497ca04f274b37ddac4c2c68ede5',
	'0x06e2d2ede26c5479c36dd310a04971604f077994',
	'0xde32a6dc2b6c90b4ab4d70b7858ebabf0640748c',
	'0x6fa0be17e4bea2fcfa22ef89bf8ac9aab0ab0fc9',
	'0xddb3422497e61e13543bea06989c0789117555c5',
	'0xc20059e0317de91738d13af027dfc4a50781b066',
	'0xda891afeb0c9ff9377a05cd91d8eac1dd8331cfd',
	'0xe4db4aa085d10585693c82fc588a4bb2c34def64',
	'0xa1aa371e450c5aee7fff259cbf5cca9384227272',
	'0x806a72273b961145cf5c5f040ad1fcd112b3f11a',
	'0xbcd75980d2e49655b2205fdbfebdebaef740fc23',
	'0xb551b43af192965f74e3dfaa476c890b403cad95',
	'0xeb3127a8f1aa9ae9c9ef2459657c3f4fa1f192de',
	'0x4f1aac70b303818ddd0823570af3bb46681d9bd8',
	'0x9fbc367b9bb966a2a537989817a088afcaffdc4c',
	'0x2f1abb81ed86be95bcf8178ba62c8e72d6834775',
	'0x87c9053c819bb28e0d73d33059e1b3da80afb0cf',
	'0x35ec69a77b79c255e5d47d5a3bdbefefe342630c',
	'0x7d4a23832fad83258b32ce4fd3109ceef4332af4',
	'0x4d4574f50dd8b9dbe623cf329dcc78d76935e610',
	'0x83869de76b9ad8125e22b857f519f001588c0f62',
	'0xf5174c9752c46208c30d0f1870b326c9a20c0679',
	'0x420658a1d8b8f5c36ddaf1bb828f347ba9011969',
	'0x360ee0225cd8abf0adf1f97f4c0f4079a4bf41ec',
	'0x8df723295214ea6f21026eeeb4382d475f146f9f',
	'0xc83e27f270cce0a3a3a29521173a83f402c1768b',
	'0x68b36248477277865c64dfc78884ef80577078f3',
	'0xc477d038d5420c6a9e0b031712f61c5120090de9',
]

makeSuite('GeckoTerminalAPI', () => {
	it('should receive price for one asset', async () => {
		const price = await GeckoTerminalAPI.getTokenPrice(
			ethTokens[0] as Address,
			'eth',
		)

		expect(price).toBeGreaterThan(0)
	})

	it('should receive prices for several assets', async () => {
		const tokensToFetch = ethTokens.slice(0, 5)
		const prices = await GeckoTerminalAPI.getTokensPrices(
			tokensToFetch as Address[],
			'eth',
		)
		expect(prices).toHaveLength(5)

		for (const token of prices) {
			expect(token.price).toBeGreaterThan(0)
		}
	})

	it('should receive prices for more than 30 assets', async () => {
		const tokensToFetch = ethTokens.slice(0, 35)
		const prices = await GeckoTerminalAPI.getTokensPrices(
			tokensToFetch as Address[],
			'eth',
		)
		expect(prices).toHaveLength(35)
		for (const token of prices) {
			expect(token.price).toBeGreaterThan(0)
		}
	})

	it('should throw an error for an invalid chain', async () => {
		await expect(
			GeckoTerminalAPI.getTokenPrice(
				ethTokens[0] as Address,
				'invalidChain',
			),
		).rejects.toThrow('Chain invalidChain not found')
	})
})
