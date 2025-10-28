type AnvilConfig = {
	chainId: number
	rpcUrl: string
	/** fork runs from this block number, default is latest */
	blockNumber?: number
	/** timeout in milliseconds for starting Anvil, default is 5000 */
	timeoutStartAnvil?: number
	/** block time in seconds, default is mine block for each transaction */
	blockTime?: number
	/** port for anvil, default is random */
	port?: number
	printTraces?: boolean
}

type ParamsUseAnvil = Omit<AnvilConfig, 'rpcUrl'> & {
	/** RPC URL for forking, default is viem's default */
	rpcUrl?: string
}
