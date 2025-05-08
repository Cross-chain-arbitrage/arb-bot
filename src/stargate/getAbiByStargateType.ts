import { OFT_ABI } from "../abi/oft"
import { STARGATE_POOL_ABI } from "../abi/stgPool"
import { StargateType } from "./metadata"

export function getAbiByStargateType(stargateType: StargateType) {
	// Handle Native stargate type
	return stargateType === "POOL" ? STARGATE_POOL_ABI : OFT_ABI
}
