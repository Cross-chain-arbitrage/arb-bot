import { Node } from './node'

export type EdgeId = string

export type Edge<T = object> = {
	id: EdgeId
	from: Node<T>
	to: Node<T>
}
