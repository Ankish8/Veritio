'use client'

import { MousePointerClick, Target, ArrowRight } from 'lucide-react'
import { BrandedButton } from '../../components/study-flow/step-layout'

interface InstructionsScreenProps {
  onContinue: () => void
}
export function InstructionsScreen({ onContinue }: InstructionsScreenProps) {
  return (
    <div
      className="flex-1 flex flex-col min-h-0"
      style={{ backgroundColor: 'var(--style-page-bg)' }}
    >
      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <div className="mx-auto px-6 py-8 max-w-lg">
          <div
            className="p-8"
            style={{
              backgroundColor: 'var(--style-card-bg)',
              borderRadius: 'var(--style-radius-lg)',
              border: '1px solid var(--style-card-border)',
              boxShadow: 'var(--style-shadow)',
            }}
          >
            <h1
              className="text-2xl font-bold mb-6 text-center"
              style={{ color: 'var(--style-text-primary)' }}
            >
              How This Works
            </h1>

            <div className="space-y-6 mb-8">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center"
                  style={{
                    borderRadius: 'var(--style-radius-xl)',
                    backgroundColor: 'var(--brand-light)',
                  }}
                >
                  <Target className="h-5 w-5" style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <h3
                    className="font-medium mb-1"
                    style={{ color: 'var(--style-text-primary)' }}
                  >
                    Read the task
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--style-text-secondary)' }}
                  >
                    You'll be given a task to complete using the prototype.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center"
                  style={{
                    borderRadius: 'var(--style-radius-xl)',
                    backgroundColor: 'var(--brand-light)',
                  }}
                >
                  <MousePointerClick className="h-5 w-5" style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <h3
                    className="font-medium mb-1"
                    style={{ color: 'var(--style-text-primary)' }}
                  >
                    Navigate the prototype
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--style-text-secondary)' }}
                  >
                    Click through the design as you would a real product to find what you're looking for.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center"
                  style={{
                    borderRadius: 'var(--style-radius-xl)',
                    backgroundColor: 'var(--brand-light)',
                  }}
                >
                  <ArrowRight className="h-5 w-5" style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <h3
                    className="font-medium mb-1"
                    style={{ color: 'var(--style-text-primary)' }}
                  >
                    Complete or skip
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--style-text-secondary)' }}
                  >
                    When you've completed the task, click the button to move on. You can also skip if you get stuck.
                  </p>
                </div>
              </div>
            </div>

            <BrandedButton onClick={onContinue} className="w-full" size="lg">
              I'm Ready to Start
            </BrandedButton>
          </div>
        </div>
      </div>
    </div>
  )
}
