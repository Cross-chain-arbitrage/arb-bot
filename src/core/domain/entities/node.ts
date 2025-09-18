export type NodeId = string

export type Node<T = object> = {
	id: NodeId
} & T
