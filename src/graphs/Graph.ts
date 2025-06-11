import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { Token } from '../primitives/tokens/Token'

export type GraphNode = Token | NativeCurrency

type GetRate =
	| ((amountIn: bigint) => Promise<{
			rate: number // negative log of exchange rate
			amountOut: bigint
	  }>)
	| ((amountIn: bigint) => {
			rate: number // negative log of exchange rate
			amountOut: bigint
	  })

export type GraphEdgeAction =
	| {
			type: 'SWAP'
			getRate: GetRate
	  }
	| {
			type: 'STARGATE_BRIDGE'
			getRate: GetRate
	  }
	| {
			type: 'FUSE_BRIDGE'
			getRate: GetRate
	  }

export interface GraphEdge {
	from: GraphNode
	to: GraphNode
	action: GraphEdgeAction
}

export class GraphError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, GraphError.prototype)
		this.name = 'GraphError'
	}
}

interface TableRow {
	from: string
	to: string
	action: string
	rate: number
}

export class Graph {
	edges: Set<GraphEdge> = new Set()
	nodes: Set<GraphNode> = new Set()

	constructor() {}

	addEdge(edge: GraphEdge) {
		if (this.edges.has(edge)) {
			throw new GraphError(
				`Edge ${edge.from.chainId}:${edge.from.address} -> ${edge.to.chainId}:${edge.to.address} already exists`,
			)
		}

		if (!this.nodes.has(edge.from)) {
			throw new GraphError(
				`Node ${edge.from.chainId}:${edge.from.address} does not exist`,
			)
		}

		if (!this.nodes.has(edge.to)) {
			throw new GraphError(
				`Node ${edge.to.chainId}:${edge.to.address} does not exist`,
			)
		}

		this.edges.add(edge)
	}

	addNode(node: GraphNode) {
		if (this.nodes.has(node)) {
			throw new GraphError(
				`Node ${node.chainId}:${node.address} already exists`,
			)
		}

		this.nodes.add(node)
	}

	async toTable(amount: bigint): Promise<TableRow[]> {
		const rows: TableRow[] = []

		for (const edge of this.edges) {
			const { rate } = await edge.action.getRate(amount)
			rows.push({
				from: `${edge.from.symbol} (${edge.from.chainId})`,
				to: `${edge.to.symbol} (${edge.to.chainId})`,
				action: edge.action.type,
				rate: rate,
			})
		}

		return rows
	}

	async printTable(amount: bigint): Promise<void> {
		const rows = await this.toTable(amount)

		// Calculate column widths
		const widths = {
			from: Math.max('From'.length, ...rows.map((r) => r.from.length)),
			to: Math.max('To'.length, ...rows.map((r) => r.to.length)),
			action: Math.max(
				'Action'.length,
				...rows.map((r) => r.action.length),
			),
			rate: Math.max(
				'Rate'.length,
				...rows.map((r) => r.rate.toFixed(6).length),
			),
		}

		// Print header
		console.log(
			'From'.padEnd(widths.from) +
				' | ' +
				'To'.padEnd(widths.to) +
				' | ' +
				'Action'.padEnd(widths.action) +
				' | ' +
				'Rate'.padEnd(widths.rate),
		)
		console.log(
			'-'.repeat(
				widths.from + widths.to + widths.action + widths.rate + 6,
			),
		)

		// Print rows
		for (const row of rows) {
			console.log(
				row.from.padEnd(widths.from) +
					' | ' +
					row.to.padEnd(widths.to) +
					' | ' +
					row.action.padEnd(widths.action) +
					' | ' +
					row.rate.toFixed(6).padEnd(widths.rate),
			)
		}
	}
}
