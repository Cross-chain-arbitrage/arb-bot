import { ConfigModule } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import {
	ARBITRAGE_NOTIFIER_TOKEN,
	ArbitrageNotifier,
} from '../../src/core/application/interfaces/arbitrage-notifier'
import { PRICE_ORACLE_TOKEN } from '../../src/core/application/interfaces/price-oracle'
import {
	FailedArbitrageResult,
	SuccessArbitrageResult,
} from '../../src/core/application/use-cases/execution/arbitrage-executor/types'
import { Token } from '../../src/core/domain/entities/token'
import { EdgeIdUtils } from '../../src/core/domain/services/edge-id-utils'
import { Quote } from '../../src/core/domain/value-objects/quote'
import { TgArbitrageNotifier } from '../../src/core/infrastructure/tg-notifier/tg-arbitrage-notifier/tg-arbitrage-notifier'
import { TgNotifier } from '../../src/core/infrastructure/tg-notifier/tg-notifier'
import { wait } from '../../src/utils/common'
import { PriceOracleMock } from './price-oracle-mock'
import { TokenMock } from './token-mock'

const tokenA: Token = new TokenMock('A', 'tokenA')
const tokenB: Token = new TokenMock('B', 'tokenB')
const step = {
	edge: {
		from: tokenA,
		to: tokenB,
		id: EdgeIdUtils.generateId('edge:edge', tokenA.id, tokenB.id),
	},
	quote: {} as Quote,
}
const opportunity = {
	costInUsd: 10,
	endAmount: 10n,
	id: 'id',
	quotedStepSequence: [step],
	profitInUsd: 10,
	revenueInUsd: 20,
	startAmount: 5n,
}
const failedResult: FailedArbitrageResult = {
	executionTime: 100,
	reason: 'whatever',
	status: 'failed',
	stepIndex: 0,
	stepAmountIn: 10n,
	failureType: 'execution',
	totalExecutionCostInUsd: 5,
}
const successResult: SuccessArbitrageResult = {
	executionTime: 100,
	actualEndAmount: 10n,
	profitInUsd: 100,
	revenueInUsd: 100,
	status: 'success',
	totalExecutionCostInUsd: 5,
}

describe('TgArbitrageNotifier', () => {
	let testAppModule: TestingModule
	let tgArbitrageNotifier: ArbitrageNotifier

	const editMessageFn = jest.fn().mockResolvedValue({})
	const sendMessageFn = jest.fn().mockResolvedValue({})

	beforeEach(async () => {
		testAppModule = await Test.createTestingModule({
			imports: [ConfigModule.forRoot({ isGlobal: true })],
			providers: [
				{ provide: PRICE_ORACLE_TOKEN, useClass: PriceOracleMock },
				{
					provide: ARBITRAGE_NOTIFIER_TOKEN,
					useClass: TgArbitrageNotifier,
				},
				{
					provide: TgNotifier,
					useValue: {
						sendMessage: sendMessageFn,
						editMessage: editMessageFn,
					},
				},
			],
		}).compile()

		tgArbitrageNotifier = testAppModule.get(ARBITRAGE_NOTIFIER_TOKEN)
		jest.clearAllMocks()
	})

	it('should send only 3 error in a row', async () => {
		for (let i = 0; i < 4; i++) {
			tgArbitrageNotifier.notifyArbitrageStart(opportunity)
			await wait(1)
			tgArbitrageNotifier.notifyArbitrageEnd(opportunity, failedResult)
			await wait(1)
		}

		expect(sendMessageFn).toHaveBeenCalledTimes(3)
		expect(editMessageFn).toHaveBeenCalledTimes(3)
	})

	it('should send only success result after 3 fails', async () => {
		for (let i = 0; i < 4; i++) {
			tgArbitrageNotifier.notifyArbitrageStart(opportunity)
			await wait(1)
			tgArbitrageNotifier.notifyArbitrageEnd(opportunity, failedResult)
			await wait(1)
		}
		jest.clearAllMocks()

		sendMessageFn.mockResolvedValueOnce(undefined)
		tgArbitrageNotifier.notifyArbitrageStart(opportunity)
		await wait(1)
		tgArbitrageNotifier.notifyArbitrageEnd(opportunity, successResult)
		await wait(1200)

		expect(sendMessageFn).toHaveBeenCalledTimes(1)
		expect(editMessageFn).toHaveBeenCalledTimes(0)
	})
})
