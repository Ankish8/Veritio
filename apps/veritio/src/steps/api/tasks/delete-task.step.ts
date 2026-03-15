import { createStep } from '../../../lib/step-factory/index'
import { tasksStepConfig } from '../../../lib/step-factory/configs/index'

const step = createStep(tasksStepConfig, 'DELETE')!

export const config = step.config
export const handler = step.handler
