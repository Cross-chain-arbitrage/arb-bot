import { ChannelId, channelScheme } from '../value-objects/channel-id'

export class ChannelIdUtils {
	static parseId(channelId: string): {
		protocol: string
		instance: string
	} {
		const channelIdChecked = channelScheme.parse(channelId)

		const [protocol, instance] = channelIdChecked.split(':')

		return { protocol, instance }
	}

	static generateId(protocol: string, instance: string): ChannelId {
		return `${protocol}:${instance}`
	}
}
