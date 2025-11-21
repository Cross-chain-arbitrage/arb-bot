import { applyDecorators } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { AppEvents, EventName, EventPayload } from './event-types'

export function OnTypedEvent<T extends EventName>(event: T) {
	return function (
		target: any,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<(payload: AppEvents[T]) => any>,
	) {
		// Type validation at design time
		return applyDecorators(OnEvent(event))(target, propertyKey, descriptor)
	}
}

export type EventHandler<T extends EventName> = (
	payload: EventPayload<T>,
) => void
