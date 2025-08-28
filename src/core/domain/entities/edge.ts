import { Node } from './node'

export type Edge<T = object> = {
	id: string
	from: Node<T>
	to: Node<T>
}
