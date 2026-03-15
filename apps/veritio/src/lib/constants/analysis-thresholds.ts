/**
 * Analysis thresholds and constants
 * Used in PCA, MDS, and hierarchical clustering algorithms
 */

// PCA Analysis thresholds
export const PCA_MIN_SUPPORT_RATIO = 0.5 // Minimum support ratio to include an IA (50%)
export const PCA_MIN_SUPPORT_COUNT = 2 // Minimum number of participants for an IA pattern
export const PCA_MAX_CLUSTERS = 10 // Maximum number of clusters to display

// Similarity calculation thresholds
export const SIMILARITY_THRESHOLD = 0.7 // Threshold for considering two IAs similar
export const JACCARD_THRESHOLD = 0.5 // Jaccard similarity threshold for card pairing

// Dataset size thresholds
export const LARGE_DATASET_THRESHOLD = 100 // Consider dataset "large" at 100+ participants
export const MEDIUM_DATASET_THRESHOLD = 50 // Medium dataset: 50-99 participants
export const SMALL_DATASET_THRESHOLD = 10 // Small dataset: <10 participants

// Hierarchical clustering thresholds
export const LINKAGE_DISTANCE_THRESHOLD = 0.8 // Distance threshold for hierarchical clustering
export const MIN_CLUSTER_SIZE = 2 // Minimum size for a valid cluster

// Dendrogram method thresholds
export const WARD_PARTICIPANT_THRESHOLD = 30 // Use Ward's method (BMM) below this participant count

// PCA Strategy thresholds
export const PCA_STRATEGY_MIN_THRESHOLD = 0.3 // Minimum similarity for strategy slider
export const PCA_STRATEGY_DEFAULT_THRESHOLD = 0.5 // Default threshold
export const PCA_STRATEGY_MAX_THRESHOLD = 0.7 // Maximum threshold for strategy slider
export const PCA_TOP_STRATEGIES_COUNT = 3 // Number of top strategies to show

// MDS (Multidimensional Scaling) parameters
export const MDS_MAX_ITERATIONS = 300 // Maximum iterations for MDS convergence
export const MDS_TOLERANCE = 0.001 // Convergence tolerance for MDS
export const MDS_INITIAL_STEP = 0.3 // Initial step size for MDS

// 3D Visualization parameters
export const CLUSTER_3D_POINT_SIZE = 5 // Size of points in 3D cluster view
export const CLUSTER_3D_OPACITY = 0.8 // Opacity of cluster points
export const CLUSTER_3D_ROTATION_SPEED = 0.001 // Auto-rotation speed

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
