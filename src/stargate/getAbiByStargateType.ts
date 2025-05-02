import { OFT_ABI } from "../abi/oft"
import { STARGATE_POOL_ABI } from "../abi/stgPool"

export function getAbiByStargateType(stargateType: number) {
	return stargateType === 0 ? STARGATE_POOL_ABI : OFT_ABI
}
