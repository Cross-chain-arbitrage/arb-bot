import dotenv from "dotenv"
import { privateKeyToAccount } from "viem/accounts"

dotenv.config()

export function getPrivateKey() {
	const privateKey = process.env[`PRIVATE_KEY`]

	if (!privateKey) {
		throw new Error(`Private key not found`)
	}

	return privateKey
}

export function getAccountAddress() {
	const pk = getPrivateKey()
	const account = privateKeyToAccount(pk as `0x${string}`)

	return account.address
}
