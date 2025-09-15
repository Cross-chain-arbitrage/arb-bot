import { Node } from './node'

export type Edge<T = Node, U = T> = {
	id: string
	from: Node<T>
	to: Node<U>
}
