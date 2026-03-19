import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { getStorageMetrics } from './performance-monitoring-service'

type SupabaseClientType = SupabaseClient<Database>

interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void
  warn: (message: string, meta?: Record<string, unknown>) => void
  error: (message: string, meta?: Record<string, unknown>) => void
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build a record that counts occurrences of `items[key]`.
 */
function countByKey<T extends Record<string, unknown>>(
  items: T[],
  key: keyof T & string
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const k = String(item[key])
    counts[k] = (counts[k] ?? 0) + 1
  }
  return counts
}

/**
 * Fetch user details (id, name, email, image) for a set of user IDs.
 * Returns a map from user ID to user info.
 */
async function fetchUserMap(
  supabase: SupabaseClientType,
  userIds: string[]
): Promise<Record<string, { name: string | null; email: string; image: string | null }>> {
  if (userIds.length === 0) return {}

  const { data: users } = await supabase
    .from('user')
    .select('id, name, email, image')
    .in('id', userIds)

  const map: Record<string, { name: string | null; email: string; image: string | null }> = {}
  for (const u of users ?? []) {
    map[u.id] = { name: u.name, email: u.email, image: u.image }
  }
  return map
}

function aggregateByDay(rows: Array<Record<string, any>>, dateField: string): Array<{ date: string; count: number }> {
  const counts: Record<string, number> = {}

  for (const row of rows) {
    const date = row[dateField]
    if (!date) continue
    const day = new Date(date).toISOString().split('T')[0]
    counts[day] = (counts[day] ?? 0) + 1
  }

  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

// ============================================================================
// OVERVIEW STATS
// ============================================================================

export async function getOverviewStats(supabase: SupabaseClientType, logger?: Logger) {
  // Get total counts using head: true + exact count
  const [usersResult, orgsResult, studiesResult, participantsResult] = await Promise.all([
    supabase.from('user').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('studies').select('*', { count: 'exact', head: true }),
    supabase.from('participants').select('*', { count: 'exact', head: true }),
  ])

  if (usersResult.error) logger?.error('Failed to count users', { error: usersResult.error.message })
  if (orgsResult.error) logger?.error('Failed to count orgs', { error: orgsResult.error.message })
  if (studiesResult.error) logger?.error('Failed to count studies', { error: studiesResult.error.message })
  if (participantsResult.error) logger?.error('Failed to count participants', { error: participantsResult.error.message })

  const totalUsers = usersResult.count ?? 0
  const totalOrgs = orgsResult.count ?? 0
  const totalStudies = studiesResult.count ?? 0
  const totalParticipants = participantsResult.count ?? 0

  // Signups per day (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()

  const { data: recentUsers } = await supabase
    .from('user')
    .select('createdAt')
    .gte('createdAt', thirtyDaysAgoIso)
    .order('createdAt', { ascending: true })

  const signupsPerDay = aggregateByDay(recentUsers ?? [], 'createdAt')

  // Studies by type
  const { data: studiesByTypeRaw } = await supabase
    .from('studies')
    .select('study_type')

  const studiesByTypeMap = countByKey(studiesByTypeRaw ?? [], 'study_type')
  const studiesByType = Object.entries(studiesByTypeMap)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  // Participants per day (last 30 days)
  const { data: recentParticipants } = await supabase
    .from('participants')
    .select('created_at')
    .gte('created_at', thirtyDaysAgoIso)
    .order('created_at', { ascending: true })

  const participantsPerDay = aggregateByDay(recentParticipants ?? [], 'created_at')

  return {
    totalUsers,
    totalOrgs,
    totalStudies,
    totalParticipants,
    signupsPerDay,
    studiesByType,
    participantsPerDay,
  }
}

// ============================================================================
// LIST USERS
// ============================================================================

export async function listUsers(supabase: SupabaseClientType, page: number, limit: number, logger?: Logger) {
  const from = page * limit
  const to = from + limit - 1

  // Get users with pagination
  const { data: users, count, error } = await supabase
    .from('user')
    .select('id, name, email, image, createdAt', { count: 'exact' })
    .order('createdAt', { ascending: false })
    .range(from, to)

  if (error) {
    logger?.error('Failed to list users', { error: error.message })
    throw new Error('Failed to list users')
  }

  // Get org count and study count per user
  const user_ids = (users ?? []).map((u) => u.id)

  const orgCounts: Record<string, number> = {}
  const studyCounts: Record<string, number> = {}

  const lastActiveMap: Record<string, string> = {}
  const aiMessageCounts: Record<string, number> = {}

  if (user_ids.length > 0) {
    // FIX: Previously made the same organization_members query twice.
    // Now we run it once and reuse the result for both org counts and study lookup.
    const [membershipsResult, sessionsResult, aiResult] = await Promise.all([
      supabase.from('organization_members').select('user_id, organization_id').in('user_id', user_ids),
      (supabase as any).from('session').select('userId, updatedAt').in('userId', user_ids).order('updatedAt', { ascending: false }),
      (supabase as any).from('assistant_rate_limits').select('user_id, message_count').in('user_id', user_ids),
    ])

    const memberships = membershipsResult.data ?? []
    for (const m of memberships) {
      orgCounts[m.user_id] = (orgCounts[m.user_id] ?? 0) + 1
    }

    // Build lastActive map (keep first per userId = most recent)
    for (const s of sessionsResult.data ?? []) {
      if (!lastActiveMap[s.userId]) {
        lastActiveMap[s.userId] = s.updatedAt
      }
    }

    // Sum AI message counts per user
    for (const r of aiResult.data ?? []) {
      aiMessageCounts[r.user_id] = (aiMessageCounts[r.user_id] ?? 0) + (r.message_count ?? 0)
    }

    // Get studies for orgs these users belong to (reuse memberships)
    const uniqueOrgIds = [...new Set(memberships.map((m: any) => m.organization_id))]
    if (uniqueOrgIds.length > 0) {
      const { data: studies } = await supabase
        .from('studies')
        .select('id, organization_id')
        .in('organization_id', uniqueOrgIds)

      // Map studies back to users via org membership
      const userOrgMap: Record<string, Set<string>> = {}
      for (const m of memberships) {
        if (!userOrgMap[m.user_id]) userOrgMap[m.user_id] = new Set()
        userOrgMap[m.user_id].add(m.organization_id)
      }

      for (const study of studies ?? []) {
        for (const user_id of user_ids) {
          if (userOrgMap[user_id]?.has(study.organization_id)) {
            studyCounts[user_id] = (studyCounts[user_id] ?? 0) + 1
          }
        }
      }
    }
  }

  const enrichedUsers = (users ?? []).map((u) => ({
    ...u,
    orgCount: orgCounts[u.id] ?? 0,
    studyCount: studyCounts[u.id] ?? 0,
    lastActive: lastActiveMap[u.id] ?? null,
    aiMessageCount: aiMessageCounts[u.id] ?? 0,
  }))

  return { users: enrichedUsers, total: count ?? 0 }
}

// ============================================================================
// LIST ORGANIZATIONS
// ============================================================================

export async function listOrganizations(supabase: SupabaseClientType, page: number, limit: number, logger?: Logger) {
  const from = page * limit
  const to = from + limit - 1

  const { data: orgs, count, error } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    logger?.error('Failed to list organizations', { error: error.message })
    throw new Error('Failed to list organizations')
  }

  const orgIds = (orgs ?? []).map((o) => o.id)

  const ownerMap: Record<string, { name: string | null; email: string }> = {}
  const memberCounts: Record<string, number> = {}
  const studyCountsMap: Record<string, number> = {}

  if (orgIds.length > 0) {
    // Get owners
    const { data: ownerMembers } = await supabase
      .from('organization_members')
      .select('organization_id, user_id')
      .in('organization_id', orgIds)
      .eq('role', 'owner')

    const ownerUserIds = (ownerMembers ?? []).map((m) => m.user_id)
    if (ownerUserIds.length > 0) {
      const userLookup = await fetchUserMap(supabase, ownerUserIds)
      for (const m of ownerMembers ?? []) {
        if (userLookup[m.user_id]) {
          ownerMap[m.organization_id] = userLookup[m.user_id]
        }
      }
    }

    // Get member counts
    const { data: allMembers } = await supabase
      .from('organization_members')
      .select('organization_id')
      .in('organization_id', orgIds)

    for (const m of allMembers ?? []) {
      memberCounts[m.organization_id] = (memberCounts[m.organization_id] ?? 0) + 1
    }

    // Get study counts
    const { data: studies } = await supabase
      .from('studies')
      .select('organization_id')
      .in('organization_id', orgIds)

    for (const s of studies ?? []) {
      studyCountsMap[s.organization_id] = (studyCountsMap[s.organization_id] ?? 0) + 1
    }
  }

  const enrichedOrgs = (orgs ?? []).map((o) => ({
    ...o,
    owner: ownerMap[o.id] ?? null,
    memberCount: memberCounts[o.id] ?? 0,
    studyCount: studyCountsMap[o.id] ?? 0,
  }))

  return { organizations: enrichedOrgs, total: count ?? 0 }
}

// ============================================================================
// LIST STUDIES
// ============================================================================

interface StudyFilters {
  status?: string
  type?: string
  search?: string
}

export async function listStudies(
  supabase: SupabaseClientType,
  page: number,
  limit: number,
  filters: StudyFilters = {},
  logger?: Logger
) {
  const from = page * limit
  const to = from + limit - 1

  let query = supabase
    .from('studies')
    .select('id, title, study_type, status, organization_id, created_at, launched_at', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.type) {
    query = query.eq('study_type', filters.type)
  }
  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`)
  }

  const { data: studies, count, error } = await query.range(from, to)

  if (error) {
    logger?.error('Failed to list studies', { error: error.message })
    throw new Error('Failed to list studies')
  }

  const studyIds = (studies ?? []).map((s) => s.id)
  const orgIds = [...new Set((studies ?? []).map((s) => s.organization_id))]

  const participantCounts: Record<string, number> = {}
  const orgNameMap: Record<string, string> = {}

  if (studyIds.length > 0) {
    const { data: participants } = await supabase
      .from('participants')
      .select('study_id')
      .in('study_id', studyIds)

    for (const p of participants ?? []) {
      participantCounts[p.study_id] = (participantCounts[p.study_id] ?? 0) + 1
    }
  }

  if (orgIds.length > 0) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', orgIds)

    for (const o of orgData ?? []) {
      orgNameMap[o.id] = o.name
    }
  }

  const enrichedStudies = (studies ?? []).map((s) => ({
    ...s,
    participantCount: participantCounts[s.id] ?? 0,
    organizationName: orgNameMap[s.organization_id] ?? null,
  }))

  return { studies: enrichedStudies, total: count ?? 0 }
}

// ============================================================================
// LIST PARTICIPANTS
// ============================================================================

interface ParticipantFilters {
  status?: string
}

export async function listParticipants(
  supabase: SupabaseClientType,
  page: number,
  limit: number,
  filters: ParticipantFilters = {},
  logger?: Logger
) {
  const from = page * limit
  const to = from + limit - 1

  let query = supabase
    .from('participants')
    .select('id, study_id, status, city, country, created_at, completed_at', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data: participants, count, error } = await query.range(from, to)

  if (error) {
    logger?.error('Failed to list participants', { error: error.message })
    throw new Error('Failed to list participants')
  }

  // Get study titles
  const studyIds = [...new Set((participants ?? []).map((p) => p.study_id))]
  const studyTitleMap: Record<string, string> = {}

  if (studyIds.length > 0) {
    const { data: studies } = await supabase
      .from('studies')
      .select('id, title')
      .in('id', studyIds)

    for (const s of studies ?? []) {
      studyTitleMap[s.id] = s.title ?? 'Untitled'
    }
  }

  const enrichedParticipants = (participants ?? []).map((p) => ({
    ...p,
    studyTitle: studyTitleMap[p.study_id] ?? 'Unknown',
  }))

  return { participants: enrichedParticipants, total: count ?? 0 }
}

// ============================================================================
// USAGE STATS
// ============================================================================

export async function getUsageStats(supabase: SupabaseClientType, logger?: Logger) {
  // DB storage
  let storage = null
  try {
    storage = await getStorageMetrics(supabase)
  } catch (error) {
    logger?.warn('Failed to get storage metrics', { error: String(error) })
  }

  // Studies this month
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthStartIso = monthStart.toISOString()

  const [studiesThisMonth, participantsThisMonth] = await Promise.all([
    supabase.from('studies').select('*', { count: 'exact', head: true }).gte('created_at', monthStartIso),
    supabase.from('participants').select('*', { count: 'exact', head: true }).gte('created_at', monthStartIso),
  ])

  // Top 10 orgs by study count
  const { data: allStudies } = await supabase
    .from('studies')
    .select('id, organization_id')

  const orgStudyCounts = countByKey(allStudies ?? [], 'organization_id')

  const topOrgIds = Object.entries(orgStudyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id]) => id)

  let topOrgs: Array<{ id: string; name: string; studyCount: number; participantCount: number }> = []

  if (topOrgIds.length > 0) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', topOrgIds)

    // Build study -> org map for top orgs
    const studyOrgMap: Record<string, string> = {}
    for (const s of allStudies ?? []) {
      if (topOrgIds.includes(s.organization_id)) {
        studyOrgMap[s.id] = s.organization_id
      }
    }

    const studyIdsForTopOrgs = Object.keys(studyOrgMap)
    const orgParticipantCounts: Record<string, number> = {}

    if (studyIdsForTopOrgs.length > 0) {
      const { data: pData } = await supabase
        .from('participants')
        .select('study_id')
        .in('study_id', studyIdsForTopOrgs)

      for (const p of pData ?? []) {
        const orgId = studyOrgMap[p.study_id]
        if (orgId) {
          orgParticipantCounts[orgId] = (orgParticipantCounts[orgId] ?? 0) + 1
        }
      }
    }

    const orgNameMap: Record<string, string> = {}
    for (const o of orgData ?? []) {
      orgNameMap[o.id] = o.name
    }

    topOrgs = topOrgIds.map((id) => ({
      id,
      name: orgNameMap[id] ?? 'Unknown',
      studyCount: orgStudyCounts[id] ?? 0,
      participantCount: orgParticipantCounts[id] ?? 0,
    }))
  }

  return {
    storage,
    studiesThisMonth: studiesThisMonth.count ?? 0,
    participantsThisMonth: participantsThisMonth.count ?? 0,
    topOrgs,
  }
}

// ============================================================================
// USERS PAGE STATS
// ============================================================================

export async function getUsersPageStats(supabase: SupabaseClientType, _logger?: Logger) {
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const fourteenDaysAgo = new Date(now)
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    newUsersThisWeek,
    newUsersPrevWeek,
    activeUsers7d,
    aiThisMonth,
    aiPrevMonth,
    totalUsers,
    totalStudies,
  ] = await Promise.all([
    supabase.from('user').select('*', { count: 'exact', head: true }).gte('createdAt', sevenDaysAgo.toISOString()),
    supabase.from('user').select('*', { count: 'exact', head: true }).gte('createdAt', fourteenDaysAgo.toISOString()).lt('createdAt', sevenDaysAgo.toISOString()),
    (supabase as any).from('session').select('userId').gte('updatedAt', sevenDaysAgo.toISOString()),
    (supabase as any).from('assistant_rate_limits').select('message_count, window_date').gte('window_date', monthStart.toISOString().split('T')[0]),
    (supabase as any).from('assistant_rate_limits').select('message_count, window_date').gte('window_date', prevMonthStart.toISOString().split('T')[0]).lt('window_date', monthStart.toISOString().split('T')[0]),
    supabase.from('user').select('*', { count: 'exact', head: true }),
    supabase.from('studies').select('*', { count: 'exact', head: true }),
  ])

  const newThisWeek = newUsersThisWeek.count ?? 0
  const newPrevWeek = newUsersPrevWeek.count ?? 0
  const newUsersThisWeekTrend = newPrevWeek > 0 ? Math.round(((newThisWeek - newPrevWeek) / newPrevWeek) * 100) : 0

  // Count distinct active users
  const activeUserIds = new Set((activeUsers7d.data ?? []).map((s: any) => s.userId))
  const activeUsers7dCount = activeUserIds.size

  // Sum AI messages
  const aiMessagesThisMonth = (aiThisMonth.data ?? []).reduce((sum: number, r: any) => sum + (r.message_count ?? 0), 0)
  const aiMessagesPrevMonth = (aiPrevMonth.data ?? []).reduce((sum: number, r: any) => sum + (r.message_count ?? 0), 0)
  const aiMessagesThisMonthTrend = aiMessagesPrevMonth > 0 ? Math.round(((aiMessagesThisMonth - aiMessagesPrevMonth) / aiMessagesPrevMonth) * 100) : 0

  const total = totalUsers.count ?? 0
  const studies = totalStudies.count ?? 0
  const avgStudiesPerUser = total > 0 ? Math.round((studies / total) * 10) / 10 : 0

  return {
    newUsersThisWeek: newThisWeek,
    newUsersThisWeekTrend,
    activeUsers7d: activeUsers7dCount,
    aiMessagesThisMonth,
    aiMessagesThisMonthTrend,
    avgStudiesPerUser,
  }
}

// ============================================================================
// USER DETAIL
// ============================================================================

export async function getUserDetail(supabase: SupabaseClientType, userId: string, logger?: Logger) {
  const [profileResult, sessionsResult, sessionCountResult, aiResult, membershipsResult, studiesResult] = await Promise.all([
    supabase.from('user').select('id, name, email, image, createdAt, emailVerified').eq('id', userId).single(),
    (supabase as any).from('session').select('updatedAt, ipAddress, userAgent').eq('userId', userId).order('updatedAt', { ascending: false }).limit(10),
    (supabase as any).from('session').select('*', { count: 'exact', head: true }).eq('userId', userId),
    (supabase as any).from('assistant_rate_limits').select('message_count, window_date').eq('user_id', userId),
    supabase.from('organization_members').select('organization_id, role, created_at').eq('user_id', userId),
    supabase.from('studies').select('id, title, study_type, status, created_at, launched_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
  ])

  if (profileResult.error) {
    logger?.error('Failed to get user profile', { error: profileResult.error.message, userId })
    throw new Error('User not found')
  }

  const profile = profileResult.data
  const sessions = sessionsResult.data ?? []
  const lastActive = sessions.length > 0 ? sessions[0].updatedAt : null
  const totalSessions = sessionCountResult.count ?? 0

  // AI usage
  const today = new Date().toISOString().split('T')[0]
  const aiRows = aiResult.data ?? []
  const aiMessagesTotal = aiRows.reduce((sum: number, r: any) => sum + (r.message_count ?? 0), 0)
  const aiMessagesToday = aiRows.filter((r: any) => r.window_date === today).reduce((sum: number, r: any) => sum + (r.message_count ?? 0), 0)

  // Org memberships with names
  const memberships = membershipsResult.data ?? []
  let organizations: Array<{ id: string; name: string; slug: string; role: string; joinedAt: string }> = []
  if (memberships.length > 0) {
    const orgIds = memberships.map((m: any) => m.organization_id)
    const { data: orgData } = await supabase.from('organizations').select('id, name, slug').in('id', orgIds)
    const orgMap: Record<string, { name: string; slug: string }> = {}
    for (const o of orgData ?? []) {
      orgMap[o.id] = { name: o.name, slug: o.slug }
    }
    organizations = memberships.map((m: any) => ({
      id: m.organization_id,
      name: orgMap[m.organization_id]?.name ?? 'Unknown',
      slug: orgMap[m.organization_id]?.slug ?? '',
      role: m.role,
      joinedAt: m.created_at,
    }))
  }

  const studies = studiesResult.data ?? []
  const studiesLaunched = studies.filter((s: any) => s.launched_at).length

  // Build timeline from studies + sessions
  const timeline: Array<{ type: string; date: string; detail: string }> = []
  for (const s of studies.slice(0, 10)) {
    if (!s.created_at) continue
    timeline.push({ type: 'study', date: s.created_at, detail: `Created "${s.title || 'Untitled'}" (${s.study_type})` })
    if (s.launched_at) {
      timeline.push({ type: 'launch', date: s.launched_at, detail: `Launched "${s.title || 'Untitled'}"` })
    }
  }
  for (const s of sessions.slice(0, 5)) {
    timeline.push({ type: 'session', date: s.updatedAt, detail: 'Session activity' })
  }
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return {
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      image: profile.image,
      createdAt: profile.createdAt,
      emailVerified: profile.emailVerified,
    },
    activity: {
      lastActive,
      totalSessions,
      aiMessagesToday,
      aiMessagesTotal,
      studiesCreated: studies.length,
      studiesLaunched,
    },
    organizations,
    recentStudies: studies,
    timeline: timeline.slice(0, 20),
  }
}

// ============================================================================
// ORGANIZATION DETAIL
// ============================================================================

export async function getOrganizationDetail(supabase: SupabaseClientType, orgId: string, logger?: Logger) {
  const [orgResult, membersResult, studiesResult] = await Promise.all([
    supabase.from('organizations').select('id, name, slug, created_at').eq('id', orgId).single(),
    supabase.from('organization_members').select('user_id, role, created_at').eq('organization_id', orgId),
    supabase.from('studies').select('id, title, study_type, status, created_at, launched_at').eq('organization_id', orgId).order('created_at', { ascending: false }),
  ])

  if (orgResult.error) {
    logger?.error('Failed to get organization', { error: orgResult.error.message, orgId })
    throw new Error('Organization not found')
  }

  const org = orgResult.data
  const members = membersResult.data ?? []
  const studies = studiesResult.data ?? []

  // Get member user details
  const memberUserIds = members.map((m) => m.user_id)
  const userMap = await fetchUserMap(supabase, memberUserIds)

  const memberDetails = members.map((m) => ({
    id: m.user_id,
    name: userMap[m.user_id]?.name ?? null,
    email: userMap[m.user_id]?.email ?? '',
    image: userMap[m.user_id]?.image ?? null,
    role: m.role,
    joinedAt: m.created_at,
  }))

  const ownerMember = members.find((m) => m.role === 'owner')
  const owner = ownerMember && userMap[ownerMember.user_id]
    ? { id: ownerMember.user_id, name: userMap[ownerMember.user_id].name, email: userMap[ownerMember.user_id].email }
    : null

  // Get participant counts per study
  const studyIds = studies.map((s) => s.id)
  const participantCounts: Record<string, number> = {}
  let totalParticipants = 0

  if (studyIds.length > 0) {
    const { data: participants } = await supabase.from('participants').select('study_id').in('study_id', studyIds)
    for (const p of participants ?? []) {
      participantCounts[p.study_id] = (participantCounts[p.study_id] ?? 0) + 1
      totalParticipants++
    }
  }

  const activeStudies = studies.filter((s) => s.status === 'active').length

  return {
    org: { id: org.id, name: org.name, slug: org.slug, createdAt: org.created_at },
    owner,
    stats: { members: members.length, studies: studies.length, participants: totalParticipants, activeStudies },
    members: memberDetails,
    studies: studies.map((s) => ({
      ...s,
      participantCount: participantCounts[s.id] ?? 0,
    })),
  }
}

