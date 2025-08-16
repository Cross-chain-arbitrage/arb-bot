import { Node } from './node'

export type EdgeId = string

export interface Edge {
	id: EdgeId
	from: Node
	to: Node
}
