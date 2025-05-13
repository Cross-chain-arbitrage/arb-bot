import { makeSuite } from "./utils/makeSuite"
import { algebraPoolTest } from "./algebraPool.test"
import { stargateApiTest } from "./stargate/StargateAPI.test"
import { stargateTest } from "./stargate/Stargate.test"

makeSuite.skip("algebra pool test", algebraPoolTest)
makeSuite("StargateAPI test", stargateApiTest)
makeSuite("Stargate test", stargateTest)
