import { createStep } from '../../../lib/step-factory/index'
import { treeNodesStepConfig } from '../../../lib/step-factory/configs/index'

const step = createStep(treeNodesStepConfig, 'LIST')!

export const config = step.config
export const handler = step.handler
