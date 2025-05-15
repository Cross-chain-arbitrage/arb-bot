import dotenv from 'dotenv'
import { Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

dotenv.config()

export function getPrivateKey(): Hex {
	const privateKey = process.env[`PRIVATE_KEY`]

	if (!privateKey) {
		throw new Error(`Private key not found`)
	}

	return privateKey as Hex
}

export function getAccountAddress() {
	const pk = getPrivateKey()
	const account = privateKeyToAccount(pk)

	return account.address
}
