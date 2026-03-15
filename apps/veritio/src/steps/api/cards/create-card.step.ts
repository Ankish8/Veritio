import { createStep } from '../../../lib/step-factory/index'
import { cardsStepConfig } from '../../../lib/step-factory/configs/index'

const step = createStep(cardsStepConfig, 'CREATE')!

export const config = step.config
export const handler = step.handler
