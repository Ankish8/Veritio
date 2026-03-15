import { createStep } from '../../../lib/step-factory/index'
import { cardsStepConfig } from '../../../lib/step-factory/configs/index'

const step = createStep(cardsStepConfig, 'UPDATE')!

export const config = step.config
export const handler = step.handler
