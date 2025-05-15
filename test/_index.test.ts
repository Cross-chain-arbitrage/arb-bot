import { makeSuite } from './utils/makeSuite'
// import { algebraPoolTest } from './algebraPool.test'
import { layerZeroScanApiTest } from './layerzero/LayerZeroScanAPI.test'
import { stargateApiTest } from './stargate/StargateAPI.test'
import { stargateTest } from './stargate/Stargate.test'
import { pollingTest } from './utils/polling.test'
import { testFuseBridge } from './fuse/FuseBridge.test'

// makeSuite('algebra pool test', algebraPoolTest)
makeSuite('LayerZeroScanAPI test', layerZeroScanApiTest)
makeSuite('StargateAPI test', stargateApiTest)
makeSuite('Stargate test', stargateTest)
makeSuite('polling test', pollingTest)
makeSuite('FuseBridge', testFuseBridge)
