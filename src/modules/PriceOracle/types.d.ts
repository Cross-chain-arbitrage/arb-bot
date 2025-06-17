type CMCQuotesResponse = {
	data: {
		[key: string]: {
			quote: { USD: { price: number } }
		}
	}
}
