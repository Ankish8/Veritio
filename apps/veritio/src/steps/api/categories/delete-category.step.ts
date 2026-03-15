import { createStep } from '../../../lib/step-factory/index'
import { categoriesStepConfig } from '../../../lib/step-factory/configs/index'

const step = createStep(categoriesStepConfig, 'DELETE')!

export const config = step.config
export const handler = step.handler
