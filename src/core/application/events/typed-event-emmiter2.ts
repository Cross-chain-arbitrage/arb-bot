import { Injectable, Module } from '@nestjs/common'
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter'
import { EventName, EventPayload } from './event-types'

@Injectable()
export class EventEmitter {
	constructor(private readonly eventEmitter: EventEmitter2) {}

	emit<T extends EventName>(event: T, payload: EventPayload<T>): boolean {
		return this.eventEmitter.emit(event, payload)
	}

	on<T extends EventName>(
		event: T,
		listener: (payload: EventPayload<T>) => void,
	): void {
		this.eventEmitter.on(event, listener)
	}

	once<T extends EventName>(
		event: T,
		listener: (payload: EventPayload<T>) => void,
	): void {
		this.eventEmitter.once(event, listener)
	}
}

@Module({
	imports: [EventEmitterModule.forRoot()],
	providers: [EventEmitter],
	exports: [EventEmitter],
})
export class TypedEventEmitterModule {}
