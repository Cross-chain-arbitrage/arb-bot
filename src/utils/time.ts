export function msToTimeIntervalString(timeMs: number): string {
	let ms = timeMs % 1000
	timeMs = (timeMs - ms) / 1000
	let secs = timeMs % 60
	timeMs = (timeMs - secs) / 60
	const mins = timeMs % 60
	const hrs = (timeMs - mins) / 60

	// If opportunity lived for minutes, then millis are not important anymore
	if (mins > 0) ms = 0
	// If opportunity lived for hours, then millis are not important anymore
	if (hrs > 0) secs = 0

	const str =
		(hrs ? hrs + 'h ' : '') +
		(mins ? mins + 'm ' : '') +
		(secs ? secs + 's ' : '') +
		(ms ? ms + 'ms' : '')

	return str
}
