import { EdgeId } from '../value-objects/edge-id'
import { Node } from './node'

export type Edge<T = Node, U = T> = {
	id: EdgeId
	from: Node<T>
	to: Node<U>
}
