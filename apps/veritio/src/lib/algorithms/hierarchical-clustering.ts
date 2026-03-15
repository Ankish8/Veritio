/**
 * Hierarchical Clustering Algorithm for Card Sorting
 *
 * Supports multiple linkage methods:
 * - 'average' (UPGMA/AAM): Average linkage - best for larger datasets (≥30 participants)
 * - 'ward' (BMM): Ward's method - minimizes variance increase, best for small datasets (<30)
 */

/**
 * Linkage method for hierarchical clustering
 * - 'average': UPGMA/AAM (Actual Agreement Method) - standard for card sorting
 * - 'ward': Ward's method (BMM - Best Merge Method) - better for small samples
 */
export type LinkageMethod = 'average' | 'ward'

export interface DendrogramNode {
  id: string
  label?: string
  children?: DendrogramNode[]
  height: number
  cards: string[]
}

interface Cluster {
  id: string
  members: number[]
  height: number
}

/**
 * Calculate Ward's distance between two clusters
 * Ward's method minimizes the increase in total within-cluster variance
 *
 * Formula: d(A,B) = sqrt((2 * |A| * |B|) / (|A| + |B|)) * avg_distance(A, B)
 */
function calculateWardDistance(
  membersA: number[],
  membersB: number[],
  distanceMatrix: number[][]
): number {
  const nA = membersA.length
  const nB = membersB.length
  const nTotal = nA + nB

  if (nTotal === 0) return 0

  // Calculate average pairwise distance between clusters
  let sumDist = 0
  for (const i of membersA) {
    for (const j of membersB) {
      sumDist += distanceMatrix[i][j]
    }
  }
  const avgDist = sumDist / (nA * nB)

  // Ward's coefficient: sqrt((2 * nA * nB) / (nA + nB))
  const wardCoef = Math.sqrt((2 * nA * nB) / nTotal)

  return wardCoef * avgDist
}

/**
 * Perform hierarchical clustering on a similarity matrix
 * @param matrix - Similarity matrix (0-100 values)
 * @param labels - Labels for each item
 * @param method - Linkage method: 'average' (UPGMA/AAM) or 'ward' (BMM)
 * @returns Root node of the dendrogram
 */
export function buildDendrogram(
  matrix: number[][],
  labels: string[],
  method: LinkageMethod = 'average'
): DendrogramNode {
  const n = labels.length

  if (n === 0) {
    return { id: 'root', height: 0, cards: [] }
  }

  if (n === 1) {
    return {
      id: labels[0],
      label: labels[0],
      height: 0,
      cards: [labels[0]],
    }
  }

  // Convert similarity to distance (100 - similarity)
  const distance: number[][] = matrix.map((row) =>
    row.map((val) => 100 - val)
  )

  // Initialize clusters - each item starts as its own cluster
  let clusters: Cluster[] = labels.map((_, idx) => ({
    id: `cluster-${idx}`,
    members: [idx],
    height: 0,
  }))

  // Track cluster distances
  const clusterDist = new Map<string, number>()

  // Initialize pairwise distances
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const key = `${clusters[i].id}-${clusters[j].id}`
      clusterDist.set(key, distance[i][j])
    }
  }

  // Node storage for building tree
  const nodes = new Map<string, DendrogramNode>()

  // Initialize leaf nodes
  for (let i = 0; i < n; i++) {
    nodes.set(`cluster-${i}`, {
      id: labels[i],
      label: labels[i],
      height: 0,
      cards: [labels[i]],
    })
  }

  let clusterCounter = n

  // Agglomerative clustering
  while (clusters.length > 1) {
    // Find closest pair of clusters
    let minDist = Infinity
    let mergeI = 0
    let mergeJ = 1

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const key = `${clusters[i].id}-${clusters[j].id}`
        const dist = clusterDist.get(key) ?? Infinity

        if (dist < minDist) {
          minDist = dist
          mergeI = i
          mergeJ = j
        }
      }
    }

    // Merge the two closest clusters
    const clusterA = clusters[mergeI]
    const clusterB = clusters[mergeJ]
    const newClusterId = `cluster-${clusterCounter++}`

    const newMembers = [...clusterA.members, ...clusterB.members]
    const newHeight = minDist

    // Create new cluster
    const newCluster: Cluster = {
      id: newClusterId,
      members: newMembers,
      height: newHeight,
    }

    // Create dendrogram node for this merge
    const nodeA = nodes.get(clusterA.id)!
    const nodeB = nodes.get(clusterB.id)!

    nodes.set(newClusterId, {
      id: newClusterId,
      children: [nodeA, nodeB],
      height: newHeight,
      cards: [...nodeA.cards, ...nodeB.cards],
    })

    // Calculate distances from new cluster to all others
    const remainingClusters = clusters.filter((_, idx) => idx !== mergeI && idx !== mergeJ)

    for (const other of remainingClusters) {
      let newDist: number

      if (method === 'ward') {
        // Ward's method: minimize within-cluster variance
        newDist = calculateWardDistance(newMembers, other.members, distance)
      } else {
        // Average linkage (UPGMA): arithmetic mean of pairwise distances
        let totalDist = 0
        for (const memberA of newMembers) {
          for (const memberOther of other.members) {
            totalDist += distance[memberA][memberOther]
          }
        }
        newDist = totalDist / (newMembers.length * other.members.length)
      }

      // Store bidirectional
      clusterDist.set(`${newClusterId}-${other.id}`, newDist)
      clusterDist.set(`${other.id}-${newClusterId}`, newDist)
    }

    // Update clusters array
    clusters = [...remainingClusters, newCluster]
  }

  // Return root node
  return nodes.get(clusters[0].id)!
}

/**
 * Flatten dendrogram to get optimal order for display
 */
export function getDendrogramOrder(node: DendrogramNode): string[] {
  if (!node.children) {
    return node.label ? [node.label] : []
  }

  const leftOrder = getDendrogramOrder(node.children[0])
  const rightOrder = getDendrogramOrder(node.children[1])

  return [...leftOrder, ...rightOrder]
}

/**
 * Calculate cluster cut at a specific height
 */
export function cutDendrogram(
  node: DendrogramNode,
  height: number
): string[][] {
  const clusters: string[][] = []

  function traverse(n: DendrogramNode): void {
    if (!n.children || n.height <= height) {
      clusters.push(n.cards)
      return
    }

    for (const child of n.children) {
      traverse(child)
    }
  }

  traverse(node)
  return clusters
}

/**
 * Get suggested number of clusters using elbow method
 */
export function suggestClusterCount(
  node: DendrogramNode,
  maxClusters: number = 10
): { count: number; heights: number[] } {
  const heights: number[] = []

  function collectHeights(n: DendrogramNode): void {
    if (n.children) {
      heights.push(n.height)
      for (const child of n.children) {
        collectHeights(child)
      }
    }
  }

  collectHeights(node)

  // Sort heights descending
  heights.sort((a, b) => b - a)

  // Find the "elbow" - largest gap in heights
  let maxGap = 0
  let elbowIndex = 1

  for (let i = 1; i < Math.min(heights.length, maxClusters); i++) {
    const gap = heights[i - 1] - heights[i]
    if (gap > maxGap) {
      maxGap = gap
      elbowIndex = i
    }
  }

  return {
    count: elbowIndex + 1,
    heights: heights.slice(0, maxClusters),
  }
}

/**
 * Wrapper function for web worker compatibility.
 * Performs hierarchical clustering and returns the full result.
 */
export function performHierarchicalClustering(data: {
  matrix: number[][]
  labels: string[]
  method?: LinkageMethod
}): {
  dendrogram: DendrogramNode
  order: string[]
  suggestedClusters: { count: number; heights: number[] }
  method: LinkageMethod
} {
  const method = data.method || 'average'
  const dendrogram = buildDendrogram(data.matrix, data.labels, method)
  const order = getDendrogramOrder(dendrogram)
  const suggestedClusters = suggestClusterCount(dendrogram)

  return {
    dendrogram,
    order,
    suggestedClusters,
    method,
  }
}
