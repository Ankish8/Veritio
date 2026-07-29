/**
 * Analysis thresholds and constants
 * Used in PCA, MDS, and hierarchical clustering algorithms
 */

// PCA (Participant-Centric Analysis) thresholds.
// There is deliberately no separate "similarity threshold" constant here: the
// agreement threshold is a single user-controlled value (the tab's slider) and
// every number PCA displays derives from it. Constants that duplicated it were
// the reason the same screen could show two different notions of "similar".
export const PCA_MIN_SUPPORT_COUNT = 2 // An IA needs at least one other participant agreeing to be shown
export const PCA_MAX_PARTICIPANTS = 1500 // Cap on the pairwise matrix; excess is reported, not hidden

// Dataset size thresholds
export const LARGE_DATASET_THRESHOLD = 100 // Consider dataset "large" at 100+ participants
export const MEDIUM_DATASET_THRESHOLD = 50 // Medium dataset: 50-99 participants
export const SMALL_DATASET_THRESHOLD = 10 // Small dataset: <10 participants

// Hierarchical clustering thresholds
export const LINKAGE_DISTANCE_THRESHOLD = 0.8 // Distance threshold for hierarchical clustering
export const MIN_CLUSTER_SIZE = 2 // Minimum size for a valid cluster

// Dendrogram method thresholds
export const WARD_PARTICIPANT_THRESHOLD = 30 // Use Ward's method (BMM) below this participant count

// PCA agreement slider. Two responses agree when at least this share of their
// combined card pairings is shared.
export const PCA_STRATEGY_MIN_THRESHOLD = 0.3
export const PCA_STRATEGY_DEFAULT_THRESHOLD = 0.5
export const PCA_STRATEGY_MAX_THRESHOLD = 0.7
export const PCA_TOP_STRATEGIES_COUNT = 3 // Number of top strategies to show

// Sample-size guidance. The reference tools recommend 30+ completed sorts before
// PCA is worth reading; below the exploratory floor it is noise.
export const PCA_MIN_MEANINGFUL_RESPONSES = 30
export const PCA_EXPLORATORY_FLOOR = 8

// Consensus IA synthesis
export const CONSENSUS_MIN_MEMBERS = 3 // Below this there is nothing to average
export const CONSENSUS_LABEL_MIN_OVERLAP = 0.5 // Card overlap before a supporter's name counts as the same group
export const CONSENSUS_LOW_CONFIDENCE = 0.5 // Cards below this are called out rather than hidden
// Leave-one-out re-runs the selection once per participant, so it is O(n^3) reads
// over the precomputed matrix. At 150 that is ~1.7M reads (single-digit ms); it is
// skipped above that, where one participant matters least anyway.
export const PCA_STABILITY_MAX_PARTICIPANTS = 150

// Pagination parameters
export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100
export const PARTICIPANTS_PAGE_SIZE = 50
export const STUDIES_PAGE_SIZE = 20

// Debounce timings (milliseconds)
export const AUTO_SAVE_DEBOUNCE_MS = 500
export const SEARCH_DEBOUNCE_MS = 300
export const API_RETRY_DEBOUNCE_MS = 1000

// Timeouts (milliseconds)
export const API_REQUEST_TIMEOUT_MS = 30000 // 30 seconds
export const WORKER_TIMEOUT_MS = 60000 // 60 seconds for heavy computations

// UI Thresholds
export const MAX_VISIBLE_CARDS_IN_CARD_SORT = 15 // Max cards to show before requiring scrolling
export const LONG_TITLE_THRESHOLD = 50 // Characters threshold for truncating titles
export const VISIBLE_CATEGORIES_THRESHOLD = 5 // Show category details threshold
