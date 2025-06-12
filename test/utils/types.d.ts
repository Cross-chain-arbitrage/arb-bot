interface AnvilConfig {
	chainId: number
	/** fork runs from this block number, default is latest */
	blockNumber?: number
	/** RPC URL for forking, default is viem's default */
	rpcUrl?: string
	/** timeout in milliseconds for starting Anvil, default is 5000 */
	timeoutStartAnvil?: number
}
