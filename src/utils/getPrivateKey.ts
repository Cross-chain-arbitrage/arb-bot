import dotenv from "dotenv"

dotenv.config()

export function getPrivateKey() {
	const privateKey = process.env[`PRIVATE_KEY`]

	if (!privateKey) {
		throw new Error(`Private key not found`)
	}

	return privateKey
}
