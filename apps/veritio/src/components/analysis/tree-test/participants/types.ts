import type { Participant as TreeTestParticipant } from '@/lib/algorithms/tree-test-analysis'
import type { Participant as FullParticipant } from '@veritio/study-types'

/** Extended participant type that works with both the limited TreeTestParticipant and full Participant */
export type ExtendedParticipant = TreeTestParticipant & Partial<Pick<FullParticipant, 'metadata' | 'url_tags' | 'identifier_value'>>
