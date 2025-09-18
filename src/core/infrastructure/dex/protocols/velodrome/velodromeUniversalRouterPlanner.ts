import { encodeAbiParameters, type AbiParameter, type Address } from 'viem'

/**
 * CommandTypes
 * @description Flags that modify a command's execution
 * @enum {number}
 */
export enum CommandType {
	V3_SWAP_EXACT_IN = 0x00,
	V2_SWAP_EXACT_IN = 0x08,
	WRAP_ETH = 0x0b,
	UNWRAP_WETH = 0x0c,
}

// ABI parameter with required name
type NamedAbiParameter = AbiParameter & { name: string }

const ABI_DEFINITION = {
	[CommandType.V3_SWAP_EXACT_IN]: [
		{ type: 'address', name: 'recipient' },
		{ type: 'uint256', name: 'amountIn' },
		{ type: 'uint256', name: 'amountOutMinimum' },
		{ type: 'bytes', name: 'path' },
		{ type: 'bool', name: 'payerIsUser' },
		{ type: 'bool', name: 'isUni' },
	],
	[CommandType.V2_SWAP_EXACT_IN]: [
		{ type: 'address', name: 'recipient' },
		{ type: 'uint256', name: 'amountIn' },
		{ type: 'uint256', name: 'amountOutMinimum' },
		{ type: 'bytes', name: 'path' },
		{ type: 'bool', name: 'payerIsUser' },
		{ type: 'bool', name: 'isUni' },
	],
	[CommandType.WRAP_ETH]: [
		{ type: 'address', name: 'recipient' },
		{ type: 'uint256', name: 'amountMinimum' },
	],
	[CommandType.UNWRAP_WETH]: [
		{ type: 'address', name: 'recipient' },
		{ type: 'uint256', name: 'amountMinimum' },
	],
} as const satisfies Record<CommandType, readonly NamedAbiParameter[]>

// Type magic to automatically infer parameter types from ABI
type AbiParameterToPrimitiveType<TAbiParameter extends NamedAbiParameter> =
	TAbiParameter['type'] extends 'address'
		? Address
		: TAbiParameter['type'] extends 'uint256'
			? bigint
			: TAbiParameter['type'] extends 'bytes'
				? `0x${string}`
				: TAbiParameter['type'] extends 'bool'
					? boolean
					: never

type AbiParametersToObject<
	TAbiParameters extends readonly NamedAbiParameter[],
> = {
	[K in TAbiParameters[number] as K['name']]: AbiParameterToPrimitiveType<K>
}

// Automatically generate parameter types for each command
export type CommandParameters = {
	[K in CommandType]: AbiParametersToObject<(typeof ABI_DEFINITION)[K]>
}

export class RoutePlanner {
	commands: Bytes
	inputs: Bytes[]

	constructor() {
		this.commands = '0x'
		this.inputs = []
	}

	addCommand<T extends CommandType>(
		commandType: T,
		parameters: CommandParameters[T],
	): void {
		const command = createCommand(commandType, parameters)
		this.inputs.push(command.encodedInput)

		this.commands = this.commands.concat(
			command.type.toString(16).padStart(2, '0'),
		) as Bytes
	}
}

export type RouterCommand = {
	type: CommandType
	encodedInput: Bytes
}

export function createCommand<T extends CommandType>(
	commandType: T,
	parameters: CommandParameters[T],
): RouterCommand {
	const abiParams = ABI_DEFINITION[commandType]
	const values = abiParams.map((param) => {
		const paramObject = parameters as Record<string, unknown>
		return paramObject[param.name]
	})

	const encodedInput = encodeAbiParameters(
		abiParams as readonly AbiParameter[],
		values as readonly unknown[],
	)

	return { type: commandType, encodedInput }
}
