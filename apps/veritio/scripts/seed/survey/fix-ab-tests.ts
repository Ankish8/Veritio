/**
 * Fix AB Test variants for the Comprehensive Survey Test
 * Updates all AB test variants with proper question_text content
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const STUDY_ID = '1170bc5d-373a-40a8-b43b-7e61ccbfd545'

interface ABTestContent {
  question_text: string
  question_text_html: string
  description?: string
  config?: Record<string, unknown>
}

async function fixABTests() {
  console.log('🔧 Fixing AB Tests for study:', STUDY_ID)

  // Get all questions for reference
  const { data: questions } = await supabase
    .from('study_flow_questions')
    .select('id, question_text, question_type, config, description')
    .eq('study_id', STUDY_ID)
    .order('position')

  // Get all AB tests
  const { data: abTests } = await supabase
    .from('ab_test_variants')
    .select('*')
    .eq('study_id', STUDY_ID)

  console.log('Found', questions?.length, 'questions and', abTests?.length, 'AB tests')

  let fixed = 0

  for (const ab of abTests || []) {
    const q = questions?.find(question => question.id === ab.entity_id)
    if (!q) {
      // This is a section AB test, handle separately
      if (ab.entity_type === 'section') {
        const { error } = await supabase
          .from('ab_test_variants')
          .update({
            variant_a_content: {
              name: 'Short Text Questions',
              description: 'Testing all short text input types',
            },
            variant_b_content: {
              name: 'Text Input Questions',
              description: 'Various text input formats',
            },
          })
          .eq('id', ab.id)

        if (!error) fixed++
      }
      continue
    }

    let variantA: ABTestContent | null = null
    let variantB: ABTestContent | null = null

    // Match by question text to set appropriate variants
    const text = q.question_text.toLowerCase()

    if (q.question_type === 'single_line_text') {
      if (text.includes('job title')) {
        variantA = {
          question_text: 'What is your job title?',
          question_text_html: '<p>What is your job title?</p>',
        }
        variantB = {
          question_text: 'What is your current role or position?',
          question_text_html: '<p>What is your current role or position?</p>',
        }
      } else if (text.includes('years of professional')) {
        variantA = {
          question_text: 'How many years of professional experience do you have?',
          question_text_html: '<p>How many years of professional experience do you have?</p>',
        }
        variantB = {
          question_text: 'Years of work experience in your field:',
          question_text_html: '<p>Years of work experience in your field:</p>',
        }
      } else if (text.includes('start using')) {
        variantA = {
          question_text: 'When did you start using our product?',
          question_text_html: '<p>When did you start using our product?</p>',
        }
        variantB = {
          question_text: 'What date did you first use our product?',
          question_text_html: '<p>What date did you first use our product?</p>',
        }
      } else if (text.includes('email')) {
        variantA = {
          question_text: 'What is your work email address?',
          question_text_html: '<p>What is your work email address?</p>',
          description: 'This will only be used for follow-up if you opt in.',
        }
        variantB = {
          question_text: 'Your professional email (optional):',
          question_text_html: '<p>Your professional email (optional):</p>',
          description: 'We may contact you for a follow-up interview.',
        }
      } else if (text.includes('react')) {
        variantA = {
          question_text: q.question_text,
          question_text_html: '<p>' + q.question_text + '</p>',
        }
        variantB = {
          question_text: 'What was their response when you recommended it?',
          question_text_html: '<p>What was their response when you recommended it?</p>',
        }
      }
    } else if (q.question_type === 'multi_line_text') {
      if (text.includes('workflow')) {
        variantA = {
          question_text: 'Describe your typical workflow when using our product.',
          question_text_html: '<p>Describe your typical workflow when using our product.</p>',
        }
        variantB = {
          question_text: 'Tell us how you use our product in your daily work.',
          question_text_html: '<p>Tell us how you use our product in your daily work.</p>',
        }
      }
    } else if (q.question_type === 'multiple_choice') {
      if (text.includes('feature do you use most')) {
        variantA = {
          question_text: 'Which feature do you use most frequently?',
          question_text_html: '<p>Which feature do you use most frequently?</p>',
        }
        variantB = {
          question_text: "What's your favorite feature?",
          question_text_html: "<p>What's your favorite feature?</p>",
        }
      } else if (text.includes('benefits')) {
        variantA = {
          question_text: 'Which benefits have you experienced using our product?',
          question_text_html: '<p>Which benefits have you experienced using our product?</p>',
        }
        variantB = {
          question_text: 'Select all the ways our product has helped you:',
          question_text_html: '<p>Select all the ways our product has helped you:</p>',
        }
      } else if (text.includes('industry')) {
        variantA = {
          question_text: 'What industry are you in?',
          question_text_html: '<p>What industry are you in?</p>',
        }
        variantB = {
          question_text: 'Which best describes your industry?',
          question_text_html: '<p>Which best describes your industry?</p>',
        }
      }
    } else if (q.question_type === 'image_choice') {
      variantA = {
        question_text: 'Which interface design do you prefer?',
        question_text_html: '<p>Which interface design do you prefer?</p>',
      }
      variantB = {
        question_text: 'Select your preferred design style:',
        question_text_html: '<p>Select your preferred design style:</p>',
      }
    } else if (q.question_type === 'yes_no') {
      if (text.includes('recommend')) {
        variantA = {
          question_text: 'Would you recommend our product to a colleague?',
          question_text_html: '<p>Would you recommend our product to a colleague?</p>',
        }
        variantB = {
          question_text: 'Have you ever recommended our product?',
          question_text_html: '<p>Have you ever recommended our product?</p>',
        }
      } else if (text.includes('expectations')) {
        variantA = {
          question_text: 'Did our product meet your expectations?',
          question_text_html: '<p>Did our product meet your expectations?</p>',
        }
        variantB = {
          question_text: 'Were your expectations met by our product?',
          question_text_html: '<p>Were your expectations met by our product?</p>',
        }
      } else if (text.includes('mobile')) {
        variantA = {
          question_text: 'Have you used the mobile app version?',
          question_text_html: '<p>Have you used the mobile app version?</p>',
        }
        variantB = {
          question_text: 'Do you use our mobile app?',
          question_text_html: '<p>Do you use our mobile app?</p>',
        }
      }
    } else if (q.question_type === 'opinion_scale') {
      if (text.includes('performance')) {
        variantA = {
          question_text: 'How satisfied are you with the product performance?',
          question_text_html: '<p>How satisfied are you with the product performance?</p>',
        }
        variantB = {
          question_text: 'Rate the product performance:',
          question_text_html: '<p>Rate the product performance:</p>',
        }
      } else if (text.includes('user interface')) {
        variantA = {
          question_text: 'How would you rate the user interface?',
          question_text_html: '<p>How would you rate the user interface?</p>',
        }
        variantB = {
          question_text: 'Rate the user interface design:',
          question_text_html: '<p>Rate the user interface design:</p>',
        }
      } else if (text.includes('customer support')) {
        variantA = {
          question_text: 'How do you feel about our customer support?',
          question_text_html: '<p>How do you feel about our customer support?</p>',
        }
        variantB = {
          question_text: 'Rate your satisfaction with our support team:',
          question_text_html: '<p>Rate your satisfaction with our support team:</p>',
        }
      }
    } else if (q.question_type === 'nps') {
      variantA = {
        question_text: 'How likely are you to recommend our product to a friend or colleague?',
        question_text_html: '<p>How likely are you to recommend our product to a friend or colleague?</p>',
      }
      variantB = {
        question_text: 'On a scale of 0-10, would you recommend our product to others?',
        question_text_html: '<p>On a scale of 0-10, would you recommend our product to others?</p>',
      }
    } else if (q.question_type === 'matrix') {
      variantA = {
        question_text: 'Please rate the following aspects of our product:',
        question_text_html: '<p>Please rate the following aspects of our product:</p>',
      }
      variantB = {
        question_text: 'How would you rate each of these areas?',
        question_text_html: '<p>How would you rate each of these areas?</p>',
      }
    } else if (q.question_type === 'ranking') {
      variantA = {
        question_text: 'Rank these potential features from most to least important:',
        question_text_html: '<p>Rank these potential features from most to least important:</p>',
      }
      variantB = {
        question_text: 'Order these features by importance to you:',
        question_text_html: '<p>Order these features by importance to you:</p>',
      }
    } else if (q.question_type === 'slider') {
      variantA = {
        question_text: 'How satisfied are you with our product overall?',
        question_text_html: '<p>How satisfied are you with our product overall?</p>',
      }
      variantB = {
        question_text: 'Overall product satisfaction level:',
        question_text_html: '<p>Overall product satisfaction level:</p>',
      }
    } else if (q.question_type === 'semantic_differential') {
      variantA = {
        question_text: 'How would you describe our product?',
        question_text_html: '<p>How would you describe our product?</p>',
      }
      variantB = {
        question_text: 'Rate our product on these dimensions:',
        question_text_html: '<p>Rate our product on these dimensions:</p>',
      }
    } else if (q.question_type === 'constant_sum') {
      variantA = {
        question_text: 'Distribute 100 points across these factors based on their importance to you:',
        question_text_html: '<p>Distribute 100 points across these factors based on their importance to you:</p>',
      }
      variantB = {
        question_text: 'Allocate 100 points to show what matters most:',
        question_text_html: '<p>Allocate 100 points to show what matters most:</p>',
      }
    }

    if (variantA && variantB) {
      const { error } = await supabase
        .from('ab_test_variants')
        .update({
          variant_a_content: variantA,
          variant_b_content: variantB,
        })
        .eq('id', ab.id)

      if (error) {
        console.error('❌ Error updating AB test for', q.question_text.substring(0, 30) + '...:', error.message)
      } else {
        console.log('✅ Fixed:', q.question_text.substring(0, 50) + '...')
        fixed++
      }
    }
  }

  console.log('\n✨ Fixed', fixed, 'AB tests')
}

fixABTests().catch(console.error)
