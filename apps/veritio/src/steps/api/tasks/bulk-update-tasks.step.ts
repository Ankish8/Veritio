import { createStep } from '../../../lib/step-factory/index'
import { tasksStepConfig } from '../../../lib/step-factory/configs/index'

const step = createStep(tasksStepConfig, 'BULK_UPDATE')!

export const config = step.config
export const handler = step.handler
