import { encodeAbiParameters, type AbiParameter, type Address } from 'viem'

// Type alias for bytes strings
type Bytes = `0x${string}`

/**
 * CommandTypes
 * @description Flags that modify a command's execution
 * @enum {number}
 */
export enum CommandType {
	V3_SWAP_EXACT_IN = 0x00,
	// V2_SWAP_EXACT_IN = 0x08,
	// WRAP_ETH = 0x0b,
	// UNWRAP_WETH = 0x0c,
	PERMIT2_PERMIT = 0x0a,
}

// struct PermitSingle {
// 	// the permit data for a single token allowance
// 	PermitDetails details;
// 	// address permissioned on the allowed tokens
// 	address spender;
// 	// deadline on the permit signature
// 	uint256 sigDeadline;
// }

// struct PermitDetails {
// 	// ERC20 token address
// 	address token;
// 	// the maximum amount allowed to spend
// 	uint160 amount;
// 	// timestamp at which a spender's token allowances become invalid
// 	uint48 expiration;
// 	// an incrementing value indexed per owner,token,and spender for each signature
// 	uint48 nonce;
// }

// Parameters:

// PermitSingle permitSingle
// bytes signature

// ABI parameter with required name
type NamedAbiParameter = AbiParameter & { name: string }

// Define PermitDetails structure
const PermitDetailsAbi = [
	{ type: 'address', name: 'token' },
	{ type: 'uint160', name: 'amount' },
	{ type: 'uint48', name: 'expiration' },
	{ type: 'uint48', name: 'nonce' },
] as const satisfies readonly NamedAbiParameter[]

// Define PermitSingle structure
const PermitSingleAbi = [
	{ type: 'tuple', name: 'details', components: PermitDetailsAbi },
	{ type: 'address', name: 'spender' },
	{ type: 'uint256', name: 'sigDeadline' },
] as const satisfies readonly NamedAbiParameter[]

const ABI_DEFINITION = {
	[CommandType.V3_SWAP_EXACT_IN]: [
		{ type: 'address', name: 'recipient' },
		{ type: 'uint256', name: 'amountIn' },
		{ type: 'uint256', name: 'amountOutMinimum' },
		{ type: 'bytes', name: 'path' },
		{ type: 'bool', name: 'payerIsUser' },
	],
	[CommandType.PERMIT2_PERMIT]: [
		{ type: 'tuple', name: 'permitSingle', components: PermitSingleAbi },
		{ type: 'bytes', name: 'signature' },
	],
	// [CommandType.V2_SWAP_EXACT_IN]: [
	// 	{ type: 'address', name: 'recipient' },
	// 	{ type: 'uint256', name: 'amountIn' },
	// 	{ type: 'uint256', name: 'amountOutMinimum' },
	// 	{ type: 'address[]', name: 'path' },
	// 	{ type: 'bool', name: 'payerIsUser' },
	// ],
	// [CommandType.WRAP_ETH]: [
	// 	{ type: 'address', name: 'recipient' },
	// 	{ type: 'uint256', name: 'amountIn' },
	// ],
	// [CommandType.UNWRAP_WETH]: [
	// 	{ type: 'address', name: 'recipient' },
	// 	{ type: 'uint256', name: 'amountIn' },
	// ],
} as const satisfies Record<CommandType, readonly NamedAbiParameter[]>

// Type magic to automatically infer parameter types from ABI
type AbiParameterToPrimitiveType<TAbiParameter extends NamedAbiParameter> =
	TAbiParameter['type'] extends 'address'
		? Address
		: TAbiParameter['type'] extends 'uint256'
			? bigint
			: TAbiParameter['type'] extends 'uint160'
				? bigint
				: TAbiParameter['type'] extends 'uint48'
					? bigint
					: TAbiParameter['type'] extends 'bytes'
						? `0x${string}`
						: TAbiParameter['type'] extends 'bool'
							? boolean
							: TAbiParameter['type'] extends 'tuple'
								? TAbiParameter extends {
										components: readonly NamedAbiParameter[]
									}
									? AbiParametersToObject<
											TAbiParameter['components']
										>
									: never
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
