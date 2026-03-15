import type { ActiveFlowSection } from '@veritio/prototype-test/stores'
import type { StudyFlowSettings, StudyFlowQuestion, FlowSection, SurveyCustomSection, QuestionType } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { SectionConfig } from '../section-config'

type FlowSettings = StudyFlowSettings

interface BuildQuestionSectionPropsParams {
  section: SectionConfig
  flowSettings: FlowSettings
  activeFlowSection: ActiveFlowSection
  selectedQuestionId: string | null
  selectedSectionId: string | null
  customSections: SurveyCustomSection[]
  isEnabled: boolean
  questions: StudyFlowQuestion[]

  // Actions
  setActiveFlowSection: (section: ActiveFlowSection) => void
  setSelectedQuestionId: (id: string | null) => void
  setSelectedSectionId: (id: string | null) => void
  handleSelectQuestion: (sectionId: ActiveFlowSection, questionId: string) => void
  handleAddQuestion: (sectionId: ActiveFlowSection) => string
  handleAddCustomSection: () => Promise<void>
  toggleSectionEnabled: (key: string) => void
  removeQuestion: (section: FlowSection, questionId: string) => void
  duplicateQuestion: (section: FlowSection, questionId: string) => string | null
  reorderQuestions: (section: FlowSection, questions: StudyFlowQuestion[]) => void
  deleteSection: (id: string) => void
  updateSection: (id: string, updates: Partial<SurveyCustomSection>) => void
  addQuestion: (section: FlowSection, type: QuestionType, customSectionId?: string) => string
  reorderSections?: (orderedSectionIds: string[]) => Promise<boolean>
  updatePreStudySettings: (settings: Partial<FlowSettings['preStudyQuestions']>) => void
  updatePostStudySettings: (settings: Partial<FlowSettings['postStudyQuestions']>) => void
  updateSurveyQuestionnaireSettings: (settings: Partial<NonNullable<FlowSettings['surveyQuestionnaire']>>) => void
}
export function buildQuestionSectionProps({
  section,
  flowSettings,
  activeFlowSection,
  selectedQuestionId,
  selectedSectionId,
  customSections,
  isEnabled,
  questions,
  setActiveFlowSection,
  setSelectedQuestionId,
  setSelectedSectionId,
  handleSelectQuestion,
  handleAddQuestion,
  toggleSectionEnabled,
  removeQuestion,
  duplicateQuestion,
  reorderQuestions,
  deleteSection,
  updateSection,
  addQuestion,
  handleAddCustomSection,
  reorderSections,
  updatePreStudySettings,
  updatePostStudySettings,
  updateSurveyQuestionnaireSettings,
}: BuildQuestionSectionPropsParams) {
  const flowSection = section.id as FlowSection
  const isActive = activeFlowSection === section.id

  // Build intro settings based on section type
  const introSettings = getIntroSettings(section.id, flowSettings)

  // Build rejection settings (only for screening)
  const rejectionSettings = section.id === 'screening'
    ? {
        rejectionTitle: flowSettings.screening?.rejectionTitle,
        rejectionMessage: flowSettings.screening?.rejectionMessage,
      }
    : undefined

  // Helper to move a question up within its list
  const handleMoveQuestionUp = (questionId: string) => {
    const currentIndex = questions.findIndex((q) => q.id === questionId)
    if (currentIndex <= 0) return // Already at top

    const newQuestions = [...questions]
    // Swap with previous question
    ;[newQuestions[currentIndex - 1], newQuestions[currentIndex]] =
      [newQuestions[currentIndex], newQuestions[currentIndex - 1]]

    reorderQuestions(flowSection, newQuestions)
  }

  // Helper to move a question down within its list
  const handleMoveQuestionDown = (questionId: string) => {
    const currentIndex = questions.findIndex((q) => q.id === questionId)
    if (currentIndex === -1 || currentIndex >= questions.length - 1) return // Already at bottom

    const newQuestions = [...questions]
    // Swap with next question
    ;[newQuestions[currentIndex], newQuestions[currentIndex + 1]] =
      [newQuestions[currentIndex + 1], newQuestions[currentIndex]]

    reorderQuestions(flowSection, newQuestions)
  }

  // Helper to move a custom section up
  const handleMoveSectionUp = async (sectionId: string) => {
    if (!customSections || !reorderSections) return

    const currentIndex = customSections.findIndex((s) => s.id === sectionId)
    if (currentIndex <= 0) return // Already at top

    const newOrder = [...customSections]
    // Swap with previous section
    ;[newOrder[currentIndex - 1], newOrder[currentIndex]] =
      [newOrder[currentIndex], newOrder[currentIndex - 1]]

    await reorderSections(newOrder.map((s) => s.id))
  }

  // Helper to move a custom section down
  const handleMoveSectionDown = async (sectionId: string) => {
    if (!customSections || !reorderSections) return

    const currentIndex = customSections.findIndex((s) => s.id === sectionId)
    if (currentIndex === -1 || currentIndex >= customSections.length - 1) return // Already at bottom

    const newOrder = [...customSections]
    // Swap with next section
    ;[newOrder[currentIndex], newOrder[currentIndex + 1]] =
      [newOrder[currentIndex + 1], newOrder[currentIndex]]

    await reorderSections(newOrder.map((s) => s.id))
  }

  // Helper to move a question up within a specific custom section
  const handleMoveQuestionUpInSection = (questionId: string) => {
    // Find which section the question belongs to
    const question = questions.find((q) => q.id === questionId)
    if (!question || !question.custom_section_id) return

    // Get all questions in this section
    const sectionQuestions = questions.filter((q) => q.custom_section_id === question.custom_section_id)
    const currentIndex = sectionQuestions.findIndex((q) => q.id === questionId)

    if (currentIndex <= 0) return // Already at top of section

    // Create new order by swapping positions
    const allQuestions = [...questions]
    const questionIndex = allQuestions.findIndex((q) => q.id === questionId)
    const prevQuestion = sectionQuestions[currentIndex - 1]
    const prevQuestionIndex = allQuestions.findIndex((q) => q.id === prevQuestion.id)

    // Swap
    ;[allQuestions[prevQuestionIndex], allQuestions[questionIndex]] =
      [allQuestions[questionIndex], allQuestions[prevQuestionIndex]]

    reorderQuestions(flowSection, allQuestions)
  }

  // Helper to move a question down within a specific custom section
  const handleMoveQuestionDownInSection = (questionId: string) => {
    // Find which section the question belongs to
    const question = questions.find((q) => q.id === questionId)
    if (!question || !question.custom_section_id) return

    // Get all questions in this section
    const sectionQuestions = questions.filter((q) => q.custom_section_id === question.custom_section_id)
    const currentIndex = sectionQuestions.findIndex((q) => q.id === questionId)

    if (currentIndex === -1 || currentIndex >= sectionQuestions.length - 1) return // Already at bottom of section

    // Create new order by swapping positions
    const allQuestions = [...questions]
    const questionIndex = allQuestions.findIndex((q) => q.id === questionId)
    const nextQuestion = sectionQuestions[currentIndex + 1]
    const nextQuestionIndex = allQuestions.findIndex((q) => q.id === nextQuestion.id)

    // Swap
    ;[allQuestions[questionIndex], allQuestions[nextQuestionIndex]] =
      [allQuestions[nextQuestionIndex], allQuestions[questionIndex]]

    reorderQuestions(flowSection, allQuestions)
  }

  return {
    icon: undefined, // Will be set by caller using sectionIcons
    title: section.title,
    description: section.description,
    questions,
    isActive,
    isEnabled,
    activeQuestionId: isActive ? selectedQuestionId : null,
    sectionId: section.id,
    hasToggle: section.enabledKey !== undefined,
    isMainActivity: section.isSurveyActivity,

    // Intro settings
    introSettings,
    isIntroSelected: isIntroSection(section.id) && isActive && selectedQuestionId === 'intro',
    onSelectIntro: isIntroSection(section.id)
      ? () => {
          setActiveFlowSection(section.id)
          setSelectedQuestionId('intro')
        }
      : undefined,
    onToggleIntro: getIntroToggleHandler(section.id, updatePreStudySettings, updatePostStudySettings, updateSurveyQuestionnaireSettings),

    // Rejection settings (screening only)
    rejectionSettings,
    isRejectionSelected: section.id === 'screening' && isActive && selectedQuestionId === 'rejection',
    onSelectRejection: section.id === 'screening'
      ? () => {
          setActiveFlowSection('screening')
          setSelectedQuestionId('rejection')
        }
      : undefined,

    // Core actions
    onSelectSection: () => {
      setActiveFlowSection(section.id)
      setSelectedQuestionId(null)
    },
    onSelectQuestion: (id: string) => handleSelectQuestion(section.id, id),
    onToggle: () => toggleSectionEnabled(section.enabledKey!),
    onAddQuestion: () => handleAddQuestion(section.id),
    onDeleteQuestion: (questionId: string) => removeQuestion(flowSection, questionId),
    onDuplicateQuestion: (questionId: string) => {
      const newId = duplicateQuestion(flowSection, questionId)
      if (newId) setSelectedQuestionId(newId)
    },

    // Settings click - for sections with advanced settings
    onSettingsClick: ['survey', 'screening', 'pre_study', 'post_study'].includes(section.id)
      ? () => {
          setActiveFlowSection(section.id)
          setSelectedQuestionId('settings') // Special value to trigger settings modal
          setSelectedSectionId(null)
        }
      : undefined,
    onAddSection: section.id === 'survey' ? handleAddCustomSection : undefined,
    customSections: section.id === 'survey' ? customSections : undefined,
    selectedCustomSectionId: section.id === 'survey' ? selectedSectionId : undefined,
    onSelectCustomSection: section.id === 'survey'
      ? (sectionId: string) => {
          setActiveFlowSection('survey')
          setSelectedSectionId(sectionId)
          setSelectedQuestionId(null)
        }
      : undefined,
    onDeleteCustomSection: section.id === 'survey' ? deleteSection : undefined,
    onRenameCustomSection: section.id === 'survey'
      ? (sectionId: string, newName: string) => updateSection(sectionId, { name: newName })
      : undefined,
    onAddQuestionToSection: section.id === 'survey'
      ? (sectionId: string) => {
          const newId = addQuestion('survey', 'multiple_choice', sectionId)
          setActiveFlowSection('survey')
          setSelectedQuestionId(newId)
        }
      : undefined,

    // Move handlers
    onMoveQuestionUp: handleMoveQuestionUp,
    onMoveQuestionDown: handleMoveQuestionDown,
    onMoveQuestionUpInSection: handleMoveQuestionUpInSection,
    onMoveQuestionDownInSection: handleMoveQuestionDownInSection,
    onMoveSectionUp: section.id === 'survey' ? handleMoveSectionUp : undefined,
    onMoveSectionDown: section.id === 'survey' ? handleMoveSectionDown : undefined,
  }
}

function isIntroSection(sectionId: ActiveFlowSection): boolean {
  return ['screening', 'pre_study', 'post_study', 'survey'].includes(sectionId)
}

function getIntroSettings(sectionId: ActiveFlowSection, flowSettings: FlowSettings) {
  switch (sectionId) {
    case 'screening':
      return {
        introTitle: flowSettings.screening?.introTitle,
        introMessage: flowSettings.screening?.introMessage,
        enabled: true,
      }
    case 'pre_study':
      return {
        introTitle: flowSettings.preStudyQuestions?.introTitle,
        introMessage: flowSettings.preStudyQuestions?.introMessage,
        enabled: flowSettings.preStudyQuestions?.showIntro !== false,
      }
    case 'post_study':
      return {
        introTitle: flowSettings.postStudyQuestions?.introTitle,
        introMessage: flowSettings.postStudyQuestions?.introMessage,
        enabled: flowSettings.postStudyQuestions?.showIntro !== false,
      }
    case 'survey':
      return {
        introTitle: flowSettings.surveyQuestionnaire?.introTitle,
        introMessage: flowSettings.surveyQuestionnaire?.introMessage,
        enabled: flowSettings.surveyQuestionnaire?.showIntro !== false,
      }
    default:
      return undefined
  }
}

function getIntroToggleHandler(
  sectionId: ActiveFlowSection,
  updatePreStudySettings: (s: Partial<FlowSettings['preStudyQuestions']>) => void,
  updatePostStudySettings: (s: Partial<FlowSettings['postStudyQuestions']>) => void,
  updateSurveyQuestionnaireSettings: (s: Partial<NonNullable<FlowSettings['surveyQuestionnaire']>>) => void,
) {
  switch (sectionId) {
    case 'pre_study':
      return (enabled: boolean) => updatePreStudySettings({ showIntro: enabled })
    case 'post_study':
      return (enabled: boolean) => updatePostStudySettings({ showIntro: enabled })
    case 'survey':
      return (enabled: boolean) => updateSurveyQuestionnaireSettings({ showIntro: enabled })
    default:
      return undefined
  }
}
