import { Address } from 'viem'
// import { LAYER_ZERO_CHAINS } from "./deployments"

interface AddressObject {
	address: string
}

interface LayerZeroChainDeployment {
	eid: string
	[key: string]: AddressObject | string | number
}

interface LayerZeroChainDetails {
	mainnetChainName?: string
	name?: string
	shortName?: string
	chainType: string
	chainKey: string
	chainStatus: string
	chainStack?: string
	nativeChainId: number
	chainLayer: string
	cgNetworkId?: string
	nativeCurrency: {
		name?: string
		symbol: string
		cgId?: string
		cmcId?: number
		decimals: number
	}
}

interface LayerZeroChainDVN {
	version: number
	canonicalName: string
	id: string
	deprecated?: boolean
}

export interface LayerZeroChain {
	deployments: LayerZeroChainDeployment[]
	chainDetails: LayerZeroChainDetails
	chainKey: string
	dvns: Record<Address, LayerZeroChainDVN>
	blockExplorers: { url: string }[]
}

const CHAINID_TO_EID = {
	1: 30101,
	2: 40108,
	10: 30111,
	14: 30295,
	25: 30359,
	30: 30333,
	37: 30216,
	40: 30199,
	50: 30365,
	56: 30102,
	66: 30155,
	81: 30285,
	82: 30176,
	88: 30196,
	97: 40102,
	100: 30145,
	101: 30168,
	103: 40168,
	122: 30138,
	130: 30320,
	137: 30109,
	146: 30332,
	148: 30230,
	169: 30217,
	196: 30274,
	204: 30202,
	232: 30373,
	239: 30377,
	250: 30112,
	252: 30255,
	291: 30213,
	295: 30316,
	300: 40305,
	324: 30165,
	388: 30360,
	480: 30319,
	592: 30210,
	747: 30336,
	957: 30311,
	964: 30374,
	999: 30367,
	1030: 30212,
	1088: 30151,
	1101: 30158,
	1116: 30153,
	1135: 30321,
	1284: 30126,
	1285: 30167,
	1300: 30342,
	1329: 30280,
	1480: 30330,
	1514: 30364,
	1559: 30173,
	1625: 30294,
	1729: 30313,
	1868: 30340,
	1890: 30309,
	1923: 30335,
	1992: 30182,
	1996: 30278,
	2222: 30177,
	2345: 30361,
	2525: 30234,
	2741: 30324,
	2818: 30322,
	3338: 30302,
	3637: 30376,
	3776: 30257,
	4200: 30266,
	4337: 30198,
	5000: 30181,
	5165: 30363,
	6001: 30293,
	6900: 30369,
	7332: 30215,
	7560: 30283,
	7700: 30159,
	7979: 30149,
	8217: 30150,
	8227: 30341,
	8453: 30184,
	8822: 30284,
	10143: 40204,
	11501: 30317,
	12739: 30366,
	17000: 40217,
	19011: 30265,
	33139: 30312,
	34443: 30260,
	41923: 30328,
	42161: 30110,
	42170: 30175,
	42220: 30125,
	42793: 30292,
	43111: 30329,
	43113: 40106,
	43114: 30106,
	43419: 30371,
	48900: 30303,
	50104: 30334,
	53935: 30115,
	55244: 30327,
	57073: 30339,
	59144: 30183,
	60808: 30279,
	68770: 30315,
	69000: 30372,
	80002: 40267,
	80069: 40371,
	80094: 30362,
	81224: 30323,
	81457: 30243,
	84532: 40245,
	94524: 30291,
	98866: 30370,
	111188: 30237,
	167000: 30290,
	200901: 30314,
	421614: 40231,
	432204: 30118,
	534352: 30214,
	660279: 30236,
	710420: 30238,
	747474: 30375,
	810180: 30301,
	5151706: 30197,
	7777777: 30195,
	11155111: 40161,
	11155420: 40232,
	21000000: 30331,
	666666666: 30267,
	728126428: 30420,
	1313161554: 30211,
	1380012617: 30235,
	1666600000: 30116,
	2046399126: 30273,
	2494104990: 40420,
}

export function getChainEIdByNativeChainId(chainId: number) {
	const eId = CHAINID_TO_EID[chainId as keyof typeof CHAINID_TO_EID]

	if (!eId) {
		throw new Error(`Chain ID ${chainId} not found in CHAINID_TO_EID`)
	}
	return eId
}
