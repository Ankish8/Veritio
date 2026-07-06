/**
 * Feature Showcase seeder — emits a single transactional .sql file to stdout.
 * Creates one feature-rich study of every non-Figma type under a dedicated
 * "Feature Showcase" project, each with 100 completed participants + realistic
 * responses. Idempotent: DELETEs prior showcase rows (by fixed study ids) first.
 *
 * Usage:  bun run seed-showcase.ts > showcase.sql
 *         psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f showcase.sql
 */

// ---- Target account / placement ----
const OWNER = "YewJvTQkiJ8WHf4onk3PwMX1zPj3PUMa"; // superadmin (ankish08@gmail.com)
const ORG = "6569df13-038a-4122-9da9-737d9934a2ae"; // Ankish Khatri's Workspace
const PROJECT = "f1f10000-0000-4000-b000-000000000000";
const S = {
  card: "f1f10001-0000-4000-b000-000000000001",
  tree: "f1f10002-0000-4000-b000-000000000002",
  survey: "f1f10003-0000-4000-b000-000000000003",
  click: "f1f10004-0000-4000-b000-000000000004",
  impression: "f1f10005-0000-4000-b000-000000000005",
  live: "f1f10006-0000-4000-b000-000000000006",
};
const ALL_STUDY_IDS = Object.values(S);

const IMG = {
  wide1: { url: "https://leeshsdeycahbyhpaokd.supabase.co/storage/v1/object/public/study-assets/050d0a46-6509-4930-ab59-5818e5083b0a/first-impression/0a3d55ed-ef61-4721-b5ac-ce1dc654d737/08a764da-be3f-4730-a747-b6081713528a.png", w: 1366, h: 932 },
  wide2: { url: "https://leeshsdeycahbyhpaokd.supabase.co/storage/v1/object/public/study-assets/050d0a46-6509-4930-ab59-5818e5083b0a/first-impression/d96510a6-98e3-4c01-8806-b4f81bb8c7b8/0b24c33b-a278-4360-b84c-1645315080d4.png", w: 1366, h: 932 },
  wide3: { url: "https://leeshsdeycahbyhpaokd.supabase.co/storage/v1/object/public/study-assets/050d0a46-6509-4930-ab59-5818e5083b0a/first-impression/fe5af37c-b44c-47a8-97af-155f40f8eab1/3343a81b-95a5-45ea-8470-7a87b78eaa71.png", w: 1366, h: 932 },
};

// ---- SQL emitter ----
const OUT: string[] = [];
const emit = (s: string) => OUT.push(s);
const qs = (s: any) => "'" + String(s).replace(/'/g, "''") + "'";
const jb = (v: any) => (v === null || v === undefined) ? "NULL" : qs(JSON.stringify(v)) + "::jsonb";
const tsl = (d: Date) => qs(d.toISOString()) + "::timestamptz";
const uarr = (ids: string[]) => qs("{" + ids.join(",") + "}") + "::uuid[]";
const tarr = (ws: string[]) => qs("{" + ws.map((w) => '"' + String(w).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"').join(",") + "}") + "::text[]";
type ColType = "jsonb" | "uuid[]" | "text[]";
function cell(v: any, t?: ColType): string {
  if (t === "jsonb") return jb(v);
  if (t === "uuid[]") return v == null ? "NULL" : uarr(v);
  if (t === "text[]") return v == null ? "NULL" : tarr(v);
  if (v === null || v === undefined) return "NULL";
  if (v instanceof Date) return tsl(v);
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return qs(v);
}
function insertRows(table: string, rows: any[], cols: string[], types: Record<string, ColType> = {}) {
  if (!rows.length) return;
  const CHUNK = 150;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const vals = chunk.map((row) => "(" + cols.map((c) => cell(row[c], types[c])).join(",") + ")").join(",\n");
    emit(`INSERT INTO ${table} (${cols.join(", ")}) VALUES\n${vals};`);
  }
}

// ---- RNG / helpers ----
const uuid = () => crypto.randomUUID();
const r = () => Math.random();
const ri = (min: number, max: number) => Math.floor(min + r() * (max - min + 1));
const rf = (min: number, max: number) => min + r() * (max - min);
const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
const chance = (p: number) => r() < p;
const shuffle = <T,>(a: T[]): T[] => a.map((v) => [r(), v] as [number, T]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const weighted = <T,>(items: [T, number][]): T => {
  const tot = items.reduce((s, i) => s + i[1], 0);
  let x = r() * tot;
  for (const [v, w] of items) if ((x -= w) <= 0) return v;
  return items[items.length - 1][0];
};

const NOW = Date.now();
const DAY = 86_400_000;
function times(durationMs: number) {
  const daysAgo = rf(0.2, 30);
  const completed = new Date(NOW - daysAgo * DAY - ri(0, 11 * 3600_000));
  const started = new Date(completed.getTime() - durationMs);
  return { started, completed };
}
const GEO = [
  { country: "United States", region: "California", city: "San Francisco" },
  { country: "United States", region: "New York", city: "New York" },
  { country: "United States", region: "Texas", city: "Austin" },
  { country: "United States", region: "Illinois", city: "Chicago" },
  { country: "United Kingdom", region: "England", city: "London" },
  { country: "Germany", region: "Berlin", city: "Berlin" },
  { country: "India", region: "Maharashtra", city: "Mumbai" },
  { country: "India", region: "Karnataka", city: "Bengaluru" },
  { country: "Canada", region: "Ontario", city: "Toronto" },
  { country: "Australia", region: "New South Wales", city: "Sydney" },
  { country: "France", region: "Ile-de-France", city: "Paris" },
  { country: "Netherlands", region: "North Holland", city: "Amsterdam" },
  { country: "Brazil", region: "Sao Paulo", city: "Sao Paulo" },
  { country: "Japan", region: "Tokyo", city: "Tokyo" },
  { country: "Singapore", region: "", city: "Singapore" },
  { country: "Spain", region: "Madrid", city: "Madrid" },
  { country: "Sweden", region: "Stockholm", city: "Stockholm" },
  { country: "Mexico", region: "Mexico City", city: "Mexico City" },
];
const CHANNELS: Record<string, string>[] = [
  {}, {}, {},
  { utm_source: "email", utm_medium: "newsletter", utm_campaign: "product_feedback" },
  { utm_source: "twitter", utm_medium: "social" },
  { utm_source: "linkedin", utm_medium: "social" },
  { utm_source: "slack", utm_medium: "referral" },
  { source: "research_panel" },
];
const DEVICES = ["Chrome/Windows", "Safari/macOS", "Chrome/macOS", "Safari/iOS", "Chrome/Android", "Firefox/Windows", "Edge/Windows"];

function mkParticipant(studyId: string, durationMs: number, extra: any = {}) {
  const g = pick(GEO);
  const { started, completed } = times(durationMs);
  return {
    id: uuid(), study_id: studyId, status: "completed",
    started_at: started, completed_at: completed,
    metadata: extra.metadata ?? { device: pick(DEVICES) },
    identifier_type: "anonymous", url_tags: pick(CHANNELS),
    country: g.country, region: g.region || null, city: g.city || null,
    categories_created: extra.categories_created ?? 0, source_app: "veritio",
  };
}
const P_COLS = ["id", "study_id", "status", "started_at", "completed_at", "metadata", "identifier_type", "url_tags", "country", "region", "city", "categories_created", "source_app"];
const P_TYPES: Record<string, ColType> = { metadata: "jsonb", url_tags: "jsonb" };

function makeProject() {
  emit(`INSERT INTO projects (id, name, description, user_id, organization_id, visibility, source_app) VALUES (${qs(PROJECT)}, ${qs("Feature Showcase")}, ${qs("Sample studies covering every Veritio study type, each with 100 realistic participants and responses.")}, ${qs(OWNER)}, ${qs(ORG)}, 'private', 'veritio');`);
}
function makeStudy(id: string, study_type: string, title: string, description: string, settings: any, purpose: string) {
  const launched = new Date(NOW - 34 * DAY);
  emit(`INSERT INTO studies (id, project_id, organization_id, user_id, study_type, title, description, status, settings, welcome_message, thank_you_message, purpose, language, launched_at, last_response_at, created_at, updated_at, source_app, is_archived) VALUES (${qs(id)}, ${qs(PROJECT)}, ${qs(ORG)}, ${qs(OWNER)}, ${qs(study_type)}, ${qs(title)}, ${qs(description)}, 'active', ${jb(settings)}, ${qs("Thanks for taking part in this study. Your feedback helps us improve.")}, ${qs("All done. Thank you for your time and thoughtful answers.")}, ${qs(purpose)}, 'en-US', ${tsl(launched)}, ${tsl(new Date(NOW - DAY))}, ${tsl(launched)}, ${tsl(new Date(NOW - DAY))}, 'veritio', false);`);
}

// =====================================================================
function cleanup() {
  const idList = ALL_STUDY_IDS.map(qs).join(", ");
  emit(`DELETE FROM participant_variant_assignments WHERE participant_id IN (SELECT id FROM participants WHERE study_id IN (${idList}));`);
  const byStudy = [
    "tree_test_post_task_responses", "first_click_post_task_responses", "live_website_post_task_responses",
    "card_sort_responses", "tree_test_responses", "study_flow_responses", "survey_responses",
    "first_click_responses", "first_impression_responses", "live_website_responses",
    "first_impression_interaction_events", "first_impression_exposures", "first_impression_sessions",
    "live_website_events", "live_website_participant_variants", "ab_test_variants",
    "cards", "categories", "tasks", "tree_nodes", "study_flow_questions", "survey_custom_sections",
    "first_click_aois", "first_click_images", "first_click_tasks",
    "first_impression_designs", "first_impression_word_groups",
    "live_website_task_variants", "live_website_variants", "live_website_tasks",
  ];
  for (const t of byStudy) emit(`DELETE FROM ${t} WHERE study_id IN (${idList});`);
  emit(`DELETE FROM participants WHERE study_id IN (${idList});`);
  emit(`DELETE FROM studies WHERE id IN (${idList});`);
  emit(`DELETE FROM projects WHERE id = ${qs(PROJECT)};`);
}

// =====================================================================
// 1. CARD SORT (hybrid)
// =====================================================================
function seedCardSort() {
  const catDefs = ["Electronics", "Home & Kitchen", "Health & Beauty", "Sports & Outdoors", "Books & Media", "Pets & Garden"];
  const cardDefs: [string, string, string][] = [
    ["Wireless Headphones", "Over-ear noise-cancelling headphones", "Electronics"],
    ["Bluetooth Speaker", "Portable waterproof speaker", "Electronics"],
    ["Smartphone Case", "Shockproof phone case", "Electronics"],
    ["USB-C Fast Charger", "65W multi-port charger", "Electronics"],
    ["Air Fryer", "5-quart digital air fryer", "Home & Kitchen"],
    ["Coffee Maker", "12-cup programmable brewer", "Home & Kitchen"],
    ["Bed Sheet Set", "400 thread-count cotton sheets", "Home & Kitchen"],
    ["Ceramic Dinnerware", "16-piece dinner set", "Home & Kitchen"],
    ["Vitamin C Serum", "Brightening facial serum", "Health & Beauty"],
    ["Sunscreen SPF 50", "Broad-spectrum sunscreen", "Health & Beauty"],
    ["Electric Toothbrush", "Rechargeable sonic toothbrush", "Health & Beauty"],
    ["Hair Dryer", "Ionic quick-dry hair dryer", "Health & Beauty"],
    ["Yoga Mat", "Non-slip exercise mat", "Sports & Outdoors"],
    ["Running Shoes", "Lightweight trail runners", "Sports & Outdoors"],
    ["Camping Tent", "4-person waterproof tent", "Sports & Outdoors"],
    ["Insulated Water Bottle", "24oz stainless bottle", "Sports & Outdoors"],
    ["Mystery Novel", "Bestselling paperback thriller", "Books & Media"],
    ["Cookbook", "Weeknight dinners cookbook", "Books & Media"],
    ["Vinyl Record", "Reissued classic album", "Books & Media"],
    ["Board Game", "Family strategy board game", "Books & Media"],
    ["Dog Food", "Grain-free dry dog food", "Pets & Garden"],
    ["Cat Litter", "Clumping odor-control litter", "Pets & Garden"],
    ["Garden Hose", "50ft expandable hose", "Pets & Garden"],
    ["Plant Fertilizer", "All-purpose plant food", "Pets & Garden"],
  ];
  const customPool = ["Tools & Hardware", "Toys & Games", "Groceries", "Office Supplies", "Gift Ideas"];
  const confusable: Record<string, string> = {
    "Board Game": "Toys & Games", "Garden Hose": "Tools & Hardware",
    "Dog Food": "Groceries", "Cat Litter": "Groceries",
    "Vinyl Record": "Electronics", "Cookbook": "Home & Kitchen",
    "Insulated Water Bottle": "Home & Kitchen", "Electric Toothbrush": "Electronics",
    "Hair Dryer": "Electronics", "USB-C Fast Charger": "Home & Kitchen",
    "Plant Fertilizer": "Home & Kitchen",
  };

  const settings = { sortType: "hybrid", randomizeCards: true, showCardDescriptions: true, allowCustomCategories: true, requireAllCardsSorted: false };
  makeStudy(S.card, "card_sort", "E-Commerce Homepage Card Sort", "Hybrid card sort to validate the product category taxonomy for a retail homepage. Participants sort 24 products into six predefined categories and may create their own.", settings, "Validate the top-level category structure and discover where shoppers expect products to live.");

  const cards = cardDefs.map(([label, description], i) => ({ id: uuid(), study_id: S.card, label, description, position: i, image: null }));
  insertRows("cards", cards, ["id", "study_id", "label", "description", "position", "image"], { image: "jsonb" });
  const cats = catDefs.map((label, i) => ({ id: uuid(), study_id: S.card, label, description: null, position: i }));
  insertRows("categories", cats, ["id", "study_id", "label", "description", "position"]);
  const cardLabel = new Map(cards.map((c) => [c.id, c.label]));
  const cardNatural = new Map(cards.map((c, i) => [c.id, cardDefs[i][2]]));

  const participants: any[] = [];
  const responses: any[] = [];
  for (let p = 0; p < 100; p++) {
    const dur = ri(45_000, 190_000);
    const usesCustom = chance(0.35);
    const myCustom: string[] = usesCustom ? shuffle(customPool).slice(0, ri(1, 2)) : [];
    const placements: Record<string, string> = {};
    for (const c of cards) {
      const label = cardLabel.get(c.id)!;
      const natural = cardNatural.get(c.id)!;
      const alt = confusable[label];
      const roll = r();
      let target = natural;
      if (usesCustom && alt && myCustom.includes(alt) && roll < 0.22) target = alt;
      else if (usesCustom && roll < 0.06) target = pick(myCustom);
      else if (alt && !customPool.includes(alt) && roll < 0.2) target = alt; // predefined confusion
      else if (roll < 0.05) target = pick(catDefs); // noise
      placements[c.id] = target;
    }
    const actualCustom = [...new Set(Object.values(placements).filter((v) => customPool.includes(v)))];
    const part = mkParticipant(S.card, dur, { categories_created: actualCustom.length });
    participants.push(part);
    responses.push({
      id: uuid(), participant_id: part.id, study_id: S.card,
      card_placements: placements,
      custom_categories: actualCustom.length ? actualCustom : null,
      total_time_ms: dur, card_movement_percentage: Number(rf(58, 96).toFixed(2)),
    });
  }
  insertRows("participants", participants, P_COLS, P_TYPES);
  insertRows("card_sort_responses", responses, ["id", "participant_id", "study_id", "card_placements", "custom_categories", "total_time_ms", "card_movement_percentage"], { card_placements: "jsonb", custom_categories: "jsonb" });
  process.stderr.write(`  card_sort: 100 participants, ${responses.length} responses\n`);
}

// =====================================================================
// 2. TREE TEST
// =====================================================================
function seedTreeTest() {
  const treeDef: [string, string | null][] = [
    ["MobileBank Home", null],
    ["Accounts", "MobileBank Home"], ["Payments & Transfers", "MobileBank Home"], ["Cards", "MobileBank Home"],
    ["Investments", "MobileBank Home"], ["Support", "MobileBank Home"], ["Settings & Profile", "MobileBank Home"],
    ["Checking Account", "Accounts"], ["Savings Account", "Accounts"], ["Balance & Activity", "Accounts"], ["Account Statements", "Accounts"],
    ["Send Money", "Payments & Transfers"], ["Transfer Between Accounts", "Payments & Transfers"], ["Bill Payments", "Payments & Transfers"], ["Set Up AutoPay", "Bill Payments"], ["Scheduled Payments", "Payments & Transfers"],
    ["Manage Cards", "Cards"], ["Block or Report Card", "Cards"], ["Card Statements", "Cards"], ["Set Card Limits", "Cards"],
    ["Portfolio", "Investments"], ["Mutual Funds", "Investments"], ["Stocks & ETFs", "Investments"], ["Fixed Deposits", "Investments"],
    ["Contact Us", "Support"], ["FAQs", "Support"], ["Live Chat", "Support"], ["Report Fraud", "Support"],
    ["Personal Details", "Settings & Profile"], ["Security & Login", "Settings & Profile"], ["Notifications", "Settings & Profile"], ["Linked Devices", "Settings & Profile"],
  ];
  const idByLabel = new Map<string, string>();
  for (const [label] of treeDef) idByLabel.set(label, uuid());
  const nodes = treeDef.map(([label, parent], i) => ({ id: idByLabel.get(label)!, study_id: S.tree, parent_id: parent ? idByLabel.get(parent)! : null, label, position: i }));
  const parentOf = new Map(nodes.map((n) => [n.id, n.parent_id]));
  const pathTo = (nodeId: string): string[] => { const path: string[] = []; let cur: string | null = nodeId; while (cur) { path.unshift(cur); cur = parentOf.get(cur) ?? null; } return path; };

  const settings = { allowBack: true, randomizeTasks: false, showBreadcrumbs: true, showTaskProgress: true, allowSkipTasks: true, answerButtonText: "I'd find it here" };
  makeStudy(S.tree, "tree_test", "Mobile Banking App Navigation Tree Test", "Reverse tree test evaluating whether users can locate key banking tasks in the app's information architecture across 7 findability tasks.", settings, "Measure findability and identify navigation labels that mislead users in the mobile banking IA.");
  insertRows("tree_nodes", nodes, ["id", "study_id", "parent_id", "label", "position"]);

  const taskDefs: [string, string, boolean][] = [
    ["You want to check the current balance of your savings account. Where would you go?", "Balance & Activity", true],
    ["You need to send money to a friend. Where would you start?", "Send Money", false],
    ["Your debit card was lost and you want to block it immediately. Where would you go?", "Block or Report Card", true],
    ["You want to set up automatic monthly payment for your electricity bill. Where would you look?", "Set Up AutoPay", false],
    ["You need to update the phone number registered on your account. Where would you go?", "Personal Details", false],
    ["You want to see how your mutual fund investments are performing. Where would you look?", "Mutual Funds", true],
    ["You want to find the customer support phone number. Where would you go?", "Contact Us", false],
  ];
  const seqQ = { id: "seq", question_type: "opinion_scale", question_text: "How easy or difficult was it to complete this task?", is_required: true, position: 0, config: { scalePoints: 7, scaleType: "numbers", startAtZero: false, leftLabel: "Very difficult", middleLabel: "Neutral", rightLabel: "Very easy" } };
  const tasks = taskDefs.map(([question, correctLabel, post], i) => ({ id: uuid(), study_id: S.tree, question, position: i, correct_node_id: idByLabel.get(correctLabel)!, correct_node_ids: [idByLabel.get(correctLabel)!], post_task_questions: post ? [seqQ] : [] }));
  insertRows("tasks", tasks, ["id", "study_id", "question", "position", "correct_node_id", "correct_node_ids", "post_task_questions"], { correct_node_ids: "jsonb", post_task_questions: "jsonb" });

  const wrongFor: Record<string, string[]> = {
    "Balance & Activity": ["Savings Account", "Checking Account", "Account Statements"],
    "Send Money": ["Transfer Between Accounts", "Scheduled Payments"],
    "Block or Report Card": ["Manage Cards", "Report Fraud", "Set Card Limits"],
    "Set Up AutoPay": ["Scheduled Payments", "Bill Payments", "Send Money"],
    "Personal Details": ["Security & Login", "Notifications"],
    "Mutual Funds": ["Portfolio", "Stocks & ETFs", "Fixed Deposits"],
    "Contact Us": ["Live Chat", "FAQs", "Report Fraud"],
  };
  const topLevel = nodes.filter((n) => n.parent_id === idByLabel.get("MobileBank Home"));

  const participants: any[] = [];
  const responses: any[] = [];
  const postResponses: any[] = [];
  const successRate = [0.62, 0.86, 0.71, 0.55, 0.79, 0.6, 0.83];
  for (let p = 0; p < 100; p++) {
    let totalDur = 0;
    const taskRows: any[] = [];
    tasks.forEach((task, ti) => {
      const correctLabel = taskDefs[ti][1];
      const correctId = idByLabel.get(correctLabel)!;
      const outcome = weighted<"success" | "wrong" | "skip">([["success", successRate[ti]], ["skip", 0.06], ["wrong", Math.max(0.05, 1 - successRate[ti] - 0.06)]]);
      const ttf = ri(700, 4200);
      let path: string[]; let selected: string | null; let isCorrect: boolean | null; let isDirect: boolean | null; let isSkipped = false; let backtracks = 0; let dur: number;
      if (outcome === "skip") {
        path = pathTo(correctId).slice(0, ri(1, 2)); selected = null; isCorrect = null; isDirect = null; isSkipped = true; dur = ri(2000, 9000);
      } else {
        const targetId = outcome === "success" ? correctId : idByLabel.get(pick(wrongFor[correctLabel]))!;
        const targetPath = pathTo(targetId);
        const direct = chance(outcome === "success" ? 0.68 : 0.5);
        if (direct) { path = [...targetPath]; backtracks = 0; }
        else {
          const wrongTop = pick(topLevel.filter((n) => n.id !== targetPath[1]));
          const detourChild = pick(nodes.filter((n) => n.parent_id === wrongTop.id));
          const detour = detourChild ? pathTo(detourChild.id) : pathTo(wrongTop.id);
          path = [...detour, ...detour.slice(0, -1).reverse().slice(1), ...targetPath.slice(1)];
          backtracks = ri(1, 2);
        }
        selected = targetId; isCorrect = outcome === "success"; isDirect = direct; dur = ri(3500, 26000) + backtracks * 3000;
      }
      totalDur += dur + ttf;
      const respId = uuid();
      taskRows.push({ respId, task, outcome, row: { id: respId, participant_id: "", study_id: S.tree, task_id: task.id, path_taken: path, selected_node_id: selected, is_correct: isCorrect, is_direct: isDirect, is_skipped: isSkipped, backtrack_count: backtracks, time_to_first_click_ms: ttf, total_time_ms: dur } });
    });
    const part = mkParticipant(S.tree, totalDur);
    participants.push(part);
    for (const tr of taskRows) {
      tr.row.participant_id = part.id;
      responses.push(tr.row);
      if ((tr.task.post_task_questions as any[]).length && tr.outcome !== "skip") {
        const val = tr.outcome === "success" ? ri(5, 7) : ri(2, 5);
        postResponses.push({ id: uuid(), tree_test_response_id: tr.respId, study_id: S.tree, participant_id: part.id, task_id: tr.task.id, question_id: "seq", value: val });
      }
    }
  }
  insertRows("participants", participants, P_COLS, P_TYPES);
  insertRows("tree_test_responses", responses, ["id", "participant_id", "study_id", "task_id", "path_taken", "selected_node_id", "is_correct", "is_direct", "is_skipped", "backtrack_count", "time_to_first_click_ms", "total_time_ms"], { path_taken: "uuid[]" });
  insertRows("tree_test_post_task_responses", postResponses, ["id", "tree_test_response_id", "study_id", "participant_id", "task_id", "question_id", "value"], { value: "jsonb" });
  process.stderr.write(`  tree_test: 100 participants, ${responses.length} task responses, ${postResponses.length} post-task\n`);
}

// =====================================================================
// 3. SURVEY (all question types + A/B)
// =====================================================================
function seedSurvey() {
  const settings = { showOneQuestionPerPage: true, randomizeQuestions: false, showProgressBar: true, allowSkipQuestions: false };
  makeStudy(S.survey, "survey", "Product Experience and Feedback Survey", "A comprehensive product feedback survey exercising every question type (choice, scales, NPS, ranking, matrix, semantic differential, constant sum) plus an A/B test on the recommendation question.", settings, "Capture a 360-degree view of product satisfaction, feature usage, and improvement priorities.");

  const mc = (id: string, label: string) => ({ id, label });
  const opt = {
    freq: [mc("daily", "Daily"), mc("weekly", "Weekly"), mc("monthly", "A few times a month"), mc("rarely", "Rarely")],
    feat: [mc("dashboard", "Dashboard"), mc("reports", "Reports"), mc("collab", "Collaboration"), mc("integrations", "Integrations"), mc("automation", "Automations"), mc("mobile", "Mobile app")],
  };
  const rankItems = [mc("speed", "Speed"), mc("ease", "Ease of use"), mc("design", "Design"), mc("integ", "Integrations"), mc("support", "Support")];
  const matrixRows = [mc("speed", "Speed"), mc("reliability", "Reliability"), mc("design", "Design"), mc("support", "Support")];
  const matrixCols = [mc("poor", "Poor"), mc("fair", "Fair"), mc("good", "Good"), mc("excellent", "Excellent")];
  const sdScales = [
    { id: "sd_intuitive", leftLabel: "Confusing", rightLabel: "Intuitive" },
    { id: "sd_fast", leftLabel: "Slow", rightLabel: "Fast" },
    { id: "sd_clean", leftLabel: "Cluttered", rightLabel: "Clean" },
    { id: "sd_modern", leftLabel: "Outdated", rightLabel: "Modern" },
  ];
  const csItems = [mc("features", "New features"), mc("performance", "Performance"), mc("support", "Support quality"), mc("pricing", "Pricing")];

  const Q = { role: uuid(), freq: uuid(), feat: uuid(), sat: uuid(), nps: uuid(), repurchase: uuid(), effort: uuid(), rank: uuid(), matrix: uuid(), semdiff: uuid(), constsum: uuid(), improve: uuid() };
  const questions = [
    { id: Q.role, question_type: "single_line_text", question_text: "What Is Your Role Or Job Title?", position: 0, is_required: true, config: { inputType: "text", placeholder: "e.g., Product Manager" } },
    { id: Q.freq, question_type: "multiple_choice", question_text: "How Often Do You Use Our Product?", position: 1, is_required: true, config: { mode: "single", options: opt.freq } },
    { id: Q.feat, question_type: "multiple_choice", question_text: "Which Features Do You Use Regularly?", position: 2, is_required: true, config: { mode: "multi", options: opt.feat, minSelections: 1 } },
    { id: Q.sat, question_type: "opinion_scale", question_text: "How Satisfied Are You With Our Product Overall?", position: 3, is_required: true, config: { scalePoints: 5, scaleType: "numerical", startAtZero: false, leftLabel: "Very dissatisfied", rightLabel: "Very satisfied" } },
    { id: Q.nps, question_type: "nps", question_text: "How Likely Are You To Recommend Us To A Colleague?", position: 4, is_required: true, config: { leftLabel: "Not at all likely", rightLabel: "Extremely likely" } },
    { id: Q.repurchase, question_type: "yes_no", question_text: "Would You Purchase Our Product Again?", position: 5, is_required: true, config: { styleType: "buttons" } },
    { id: Q.effort, question_type: "slider", question_text: "How Much Effort Did It Take To Accomplish Your Goal?", position: 6, is_required: true, config: { minValue: 0, maxValue: 100, step: 5, leftLabel: "No effort at all", rightLabel: "Extreme effort", showValue: true } },
    { id: Q.rank, question_type: "ranking", question_text: "Rank These Areas By How Important They Are To You.", position: 7, is_required: true, config: { items: rankItems, randomOrder: true } },
    { id: Q.matrix, question_type: "matrix", question_text: "Rate Each Aspect Of Your Experience.", position: 8, is_required: true, config: { rows: matrixRows, columns: matrixCols } },
    { id: Q.semdiff, question_type: "semantic_differential", question_text: "How Would You Describe The Interface?", position: 9, is_required: true, config: { scalePoints: 5, scales: sdScales, showNumbers: true } },
    { id: Q.constsum, question_type: "constant_sum", question_text: "Allocate 100 Points Across What Matters Most To You.", position: 10, is_required: true, config: { items: csItems, totalPoints: 100, displayMode: "inputs", showBars: true } },
    { id: Q.improve, question_type: "multi_line_text", question_text: "What Is One Thing We Could Improve?", position: 11, is_required: false, config: { placeholder: "Share your thoughts..." } },
  ];
  const qRows = questions.map((q) => ({ id: q.id, study_id: S.survey, section: "survey", position: q.position, question_type: q.question_type, question_text: q.question_text, is_required: q.is_required, config: q.config }));
  insertRows("study_flow_questions", qRows, ["id", "study_id", "section", "position", "question_type", "question_text", "is_required", "config"], { config: "jsonb" });

  const abId = uuid();
  const variantA = { id: Q.nps, section: "survey", position: 4, question_type: "nps", question_text: "How Likely Are You To Recommend Us To A Colleague?", is_required: true, config: { leftLabel: "Not at all likely", rightLabel: "Extremely likely" } };
  const variantB = { id: Q.nps, section: "survey", position: 4, question_type: "nps", question_text: "On A Scale Of 0-10, How Likely Are You To Recommend Our Product To A Friend?", is_required: true, config: { leftLabel: "Definitely not", rightLabel: "Absolutely" } };
  emit(`INSERT INTO ab_test_variants (id, study_id, entity_type, entity_id, variant_a_content, variant_b_content, split_percentage, is_enabled) VALUES (${qs(abId)}, ${qs(S.survey)}, 'question', ${qs(Q.nps)}, ${jb(variantA)}, ${jb(variantB)}, 50, true);`);

  const roles = ["Product Manager", "UX Designer", "Software Engineer", "Marketing Manager", "Founder / CEO", "Data Analyst", "Customer Success Manager", "UX Researcher", "Operations Lead", "Sales Manager", "Content Strategist", "Engineering Manager"];
  const improvements = [
    "Faster load times on the reports page would make a big difference.", "I'd love a dark mode and more keyboard shortcuts.",
    "The onboarding could use clearer step-by-step guidance.", "More integrations, especially with Slack and Notion.",
    "Mobile app feature parity with the desktop version.", "Better bulk-editing tools for large projects.",
    "The pricing tiers are a little confusing to compare.", "Improved search and filtering across studies.",
    "Give us more export formats for the analysis.", "Notifications are noisy; let me fine-tune them.",
    "It's already great, just keep improving performance.", "Add templates so new users can start faster.", "",
  ];

  const participants: any[] = [];
  const responses: any[] = [];
  const assignments: any[] = [];
  for (let p = 0; p < 100; p++) {
    const dur = ri(90_000, 420_000);
    const part = mkParticipant(S.survey, dur);
    participants.push(part);
    assignments.push({ id: uuid(), participant_id: part.id, ab_test_variant_id: abId, assigned_variant: chance(0.5) ? "A" : "B" });
    const happy = chance(0.68);
    const push = (qid: string, value: any) => responses.push({ id: uuid(), participant_id: part.id, question_id: qid, study_id: S.survey, response_value: value, response_time_ms: ri(1500, 22000) });
    push(Q.role, pick(roles));
    push(Q.freq, { optionId: weighted<string>([["daily", happy ? 5 : 2], ["weekly", 4], ["monthly", 2], ["rarely", 1]]) });
    push(Q.feat, { optionIds: shuffle(opt.feat.map((o) => o.id)).slice(0, ri(1, 4)) });
    push(Q.sat, happy ? ri(4, 5) : ri(2, 4));
    push(Q.nps, { value: happy ? ri(8, 10) : ri(3, 8) });
    push(Q.repurchase, happy ? chance(0.92) : chance(0.45));
    push(Q.effort, happy ? ri(5, 45) : ri(35, 90));
    push(Q.rank, shuffle(rankItems.map((i) => i.id)));
    const matrixVal: Record<string, string> = {};
    for (const row of matrixRows) matrixVal[row.id] = weighted<string>(happy ? [["excellent", 4], ["good", 4], ["fair", 2], ["poor", 1]] : [["excellent", 1], ["good", 3], ["fair", 3], ["poor", 2]]);
    push(Q.matrix, matrixVal);
    const sdVal: Record<string, number> = {};
    for (const s of sdScales) sdVal[s.id] = happy ? ri(0, 2) : ri(-2, 1);
    push(Q.semdiff, sdVal);
    let rem = 100; const csVal: Record<string, number> = {};
    csItems.forEach((it, i) => { if (i === csItems.length - 1) csVal[it.id] = rem; else { const v = ri(5, Math.max(6, rem - (csItems.length - 1 - i) * 5)); csVal[it.id] = v; rem -= v; } });
    push(Q.constsum, csVal);
    if (chance(0.8)) push(Q.improve, pick(improvements));
  }
  insertRows("participants", participants, P_COLS, P_TYPES);
  insertRows("study_flow_responses", responses, ["id", "participant_id", "question_id", "study_id", "response_value", "response_time_ms"], { response_value: "jsonb" });
  insertRows("participant_variant_assignments", assignments, ["id", "participant_id", "ab_test_variant_id", "assigned_variant"]);
  process.stderr.write(`  survey: 100 participants, ${responses.length} answers, ${assignments.length} A/B assignments\n`);
}

// =====================================================================
// 4. FIRST-CLICK TEST
// =====================================================================
function seedFirstClick() {
  const settings = { allowSkipTasks: true, startTasksImmediately: false, randomizeTasks: true, dontRandomizeFirstTask: true, showEachParticipantTasks: "all", showTaskProgress: true, imageScaling: "never_scale", taskInstructionPosition: "top-left", taskFeedbackPageMode: "one_per_page" };
  makeStudy(S.click, "first_click", "Pricing Page First-Click Test", "First-click test measuring where users click first to complete three common goals on the marketing site: starting a trial, comparing pricing, and finding support.", settings, "Confirm the primary calls-to-action attract the first click for each key task.");

  // Coordinates are NORMALIZED fractions of the image (0-1), per DB check constraints.
  const taskDefs = [
    { instr: "Where would you click first to start a free trial?", img: IMG.wide1, aois: [
      { name: "Primary CTA (Start Trial)", x: 0.70, y: 0.13, w: 0.22, h: 0.10, correct: true },
      { name: "Top Navigation", x: 0.0, y: 0.0, w: 1.0, h: 0.09 },
      { name: "Hero Illustration", x: 0.50, y: 0.28, w: 0.42, h: 0.45 },
      { name: "Footer Links", x: 0.0, y: 0.88, w: 1.0, h: 0.12 },
    ] },
    { instr: "Where would you click to see the pricing plans?", img: IMG.wide2, aois: [
      { name: "Pricing Nav Link", x: 0.38, y: 0.02, w: 0.11, h: 0.05, correct: true },
      { name: "Logo", x: 0.02, y: 0.02, w: 0.12, h: 0.055 },
      { name: "Sign Up Button", x: 0.86, y: 0.02, w: 0.11, h: 0.056 },
      { name: "Body Content", x: 0.09, y: 0.28, w: 0.80, h: 0.52 },
    ] },
    { instr: "Where would you click to contact customer support?", img: IMG.wide3, aois: [
      { name: "Help / Support Link", x: 0.82, y: 0.025, w: 0.09, h: 0.05, correct: true },
      { name: "Search Bar", x: 0.29, y: 0.15, w: 0.41, h: 0.065 },
      { name: "Main Content", x: 0.09, y: 0.28, w: 0.80, h: 0.49 },
      { name: "Footer Contact", x: 0.03, y: 0.90, w: 0.30, h: 0.075 },
    ] },
  ];

  const tasks: any[] = []; const images: any[] = []; const aois: any[] = []; const taskMeta: any[] = [];
  taskDefs.forEach((t, i) => {
    const taskId = uuid(); const imageId = uuid();
    const postQ = i === 0 ? [{ id: "fc-confidence", question_type: "opinion_scale", question_text: "How confident are you that you clicked the right place?", is_required: false, position: 0, config: { scalePoints: 5, scaleType: "numbers", startAtZero: false, leftLabel: "Not confident", rightLabel: "Very confident" } }] : [];
    tasks.push({ id: taskId, study_id: S.click, instruction: t.instr, position: i, post_task_questions: postQ });
    images.push({ id: imageId, task_id: taskId, study_id: S.click, image_url: t.img.url, original_filename: `screen-${i + 1}.png`, width: t.img.w, height: t.img.h, source_type: "upload" });
    const aoiRows = t.aois.map((a, j) => { const id = uuid(); aois.push({ id, image_id: imageId, task_id: taskId, study_id: S.click, name: a.name, x: a.x, y: a.y, width: a.w, height: a.h, position: j }); return { id, ...a }; });
    taskMeta.push({ taskId, imageId, img: t.img, aois: aoiRows, hasPost: postQ.length > 0 });
  });
  insertRows("first_click_tasks", tasks, ["id", "study_id", "instruction", "position", "post_task_questions"], { post_task_questions: "jsonb" });
  insertRows("first_click_images", images, ["id", "task_id", "study_id", "image_url", "original_filename", "width", "height", "source_type"]);
  insertRows("first_click_aois", aois, ["id", "image_id", "task_id", "study_id", "name", "x", "y", "width", "height", "position"]);

  const participants: any[] = []; const responses: any[] = []; const postResponses: any[] = [];
  const correctRate = [0.72, 0.64, 0.58];
  for (let p = 0; p < 100; p++) {
    let totalDur = 0; const rows: any[] = [];
    taskMeta.forEach((tm, ti) => {
      const target = tm.aois.find((a: any) => a.correct)!;
      const outcome = weighted<"correct" | "other" | "miss">([["correct", correctRate[ti]], ["other", 1 - correctRate[ti] - 0.06], ["miss", 0.06]]);
      let aoi: any = null; let cx: number; let cy: number;
      if (outcome === "correct") aoi = target;
      else if (outcome === "other") aoi = pick(tm.aois.filter((a: any) => !a.correct));
      const clamp01 = (v: number) => Math.min(0.999, Math.max(0.001, v));
      if (aoi) { cx = clamp01(rf(aoi.x + 0.005, aoi.x + aoi.w - 0.005)); cy = clamp01(rf(aoi.y + 0.005, aoi.y + aoi.h - 0.005)); }
      else { cx = rf(0.02, 0.98); cy = rf(0.02, 0.98); }
      cx = Number(cx.toFixed(4)); cy = Number(cy.toFixed(4));
      const t2c = ri(600, 8500);
      totalDur += t2c + ri(500, 2000);
      const respId = uuid();
      rows.push({ respId, taskId: tm.taskId, hasPost: tm.hasPost, correct: outcome === "correct", row: { id: respId, participant_id: "", task_id: tm.taskId, study_id: S.click, image_id: tm.imageId, click_x: cx, click_y: cy, time_to_click_ms: t2c, is_correct: outcome === "correct", matched_aoi_id: aoi ? aoi.id : null, is_skipped: false, viewport_width: 1440, viewport_height: 900, image_rendered_width: tm.img.w, image_rendered_height: tm.img.h } });
    });
    const part = mkParticipant(S.click, totalDur);
    participants.push(part);
    for (const rr of rows) {
      rr.row.participant_id = part.id; responses.push(rr.row);
      if (rr.hasPost) postResponses.push({ id: uuid(), response_id: rr.respId, study_id: S.click, participant_id: part.id, task_id: rr.taskId, question_id: "fc-confidence", value: rr.correct ? ri(4, 5) : ri(2, 4) });
    }
  }
  insertRows("participants", participants, P_COLS, P_TYPES);
  insertRows("first_click_responses", responses, ["id", "participant_id", "task_id", "study_id", "image_id", "click_x", "click_y", "time_to_click_ms", "is_correct", "matched_aoi_id", "is_skipped", "viewport_width", "viewport_height", "image_rendered_width", "image_rendered_height"]);
  insertRows("first_click_post_task_responses", postResponses, ["id", "response_id", "study_id", "participant_id", "task_id", "question_id", "value"], { value: "jsonb" });
  process.stderr.write(`  first_click: 100 participants, ${responses.length} clicks, ${postResponses.length} post-task\n`);
}

// =====================================================================
// 5. FIRST IMPRESSION TEST (A/B/C designs, random_single)
// =====================================================================
function seedFirstImpression() {
  const settings = { exposureDurationMs: 8000, countdownDurationMs: 5000, showTimerToParticipant: true, showProgressIndicator: false, displayMode: "fit", backgroundColor: "#ffffff", questionDisplayMode: "one_per_page", randomizeQuestions: false, questionMode: "shared", designAssignmentMode: "random_single", allowPracticeDesign: false };
  makeStudy(S.impression, "first_impression", "SaaS Landing Page First Impression Test", "Five-second first impression test comparing three landing page variants (A/B/C) with weighted random assignment, capturing gut-reaction sentiment, comprehension, and appeal.", settings, "Compare three landing page directions on trust, clarity, and visual appeal within the first five seconds.");

  const qImpression = uuid(), qWord = uuid(), qAbout = uuid(), qAppeal = uuid();
  const impressionOpts = [{ id: "trust", label: "Trustworthy" }, { id: "prof", label: "Professional" }, { id: "neutral", label: "Neutral" }, { id: "confusing", label: "Confusing" }, { id: "untrust", label: "Untrustworthy" }];
  const questions = [
    { id: qImpression, question_type: "multiple_choice", question_text: "What Is Your First Impression Of This Design?", is_required: true, position: 0, config: { mode: "single", options: impressionOpts } },
    { id: qWord, question_type: "single_line_text", question_text: "In One Word, How Would You Describe This Design?", is_required: true, position: 1, config: { inputType: "text", placeholder: "" } },
    { id: qAbout, question_type: "single_line_text", question_text: "What Do You Think This Product Or Page Is About?", is_required: true, position: 2, config: { inputType: "text", placeholder: "" } },
    { id: qAppeal, question_type: "opinion_scale", question_text: "How Visually Appealing Is This Design?", is_required: true, position: 3, config: { scalePoints: 5, scaleType: "numbers", startAtZero: false, leftLabel: "Not appealing", rightLabel: "Very appealing" } },
  ];
  const designDefs = [
    { name: "Version A", img: IMG.wide1, weight: 40, appealBias: 0.75 },
    { name: "Version B", img: IMG.wide2, weight: 35, appealBias: 0.6 },
    { name: "Version C", img: IMG.wide3, weight: 25, appealBias: 0.45 },
  ];
  const designs = designDefs.map((d, i) => ({ id: uuid(), study_id: S.impression, name: d.name, position: i, image_url: d.img.url, original_filename: `${d.name.toLowerCase().replace(" ", "-")}.png`, source_type: "upload", width: d.img.w, height: d.img.h, display_mode: "fit", background_color: "#ffffff", weight: d.weight, is_practice: false, questions }));
  insertRows("first_impression_designs", designs, ["id", "study_id", "name", "position", "image_url", "original_filename", "source_type", "width", "height", "display_mode", "background_color", "weight", "is_practice", "questions"], { questions: "jsonb" });

  const wordGroups = [
    { id: uuid(), study_id: S.impression, design_id: null, question_id: qWord, group_name: "Positive", words: ["modern", "clean", "professional", "sleek", "trustworthy", "polished", "friendly"], created_by: OWNER },
    { id: uuid(), study_id: S.impression, design_id: null, question_id: qWord, group_name: "Negative", words: ["cluttered", "confusing", "outdated", "busy", "generic", "boring"], created_by: OWNER },
  ];
  insertRows("first_impression_word_groups", wordGroups, ["id", "study_id", "design_id", "question_id", "group_name", "words", "created_by"], { words: "text[]" });

  const positiveWords = ["modern", "clean", "professional", "sleek", "trustworthy", "polished", "friendly", "minimal", "bold"];
  const negativeWords = ["cluttered", "confusing", "outdated", "busy", "generic", "boring", "plain"];
  const aboutAnswers = ["A SaaS analytics tool", "Some kind of productivity app", "A project management platform", "A marketing or CRM product", "A design collaboration tool", "A finance dashboard", "A developer platform", "Not entirely sure, maybe a data product"];

  const participants: any[] = []; const sessions: any[] = []; const exposures: any[] = []; const responses: any[] = []; const events: any[] = [];
  const byWeight = designs.map((d, i) => [d, designDefs[i].weight] as [any, number]);
  for (let p = 0; p < 100; p++) {
    const design = weighted<any>(byWeight);
    const bias = designDefs[designs.indexOf(design)].appealBias;
    const good = chance(bias);
    const device = weighted<"desktop" | "mobile" | "tablet">([["desktop", 6], ["mobile", 3], ["tablet", 1]]);
    const vw = device === "desktop" ? pick([1440, 1536, 1366, 1920]) : device === "mobile" ? pick([390, 402, 414]) : 820;
    const vh = device === "desktop" ? 900 : device === "mobile" ? 844 : 1180;
    const exposureMs = 8000 + ri(-400, 400);
    const answerMs = ri(9000, 40000);
    const totalMs = 5000 + exposureMs + answerMs;
    const { started, completed } = times(totalMs);
    const part = mkParticipant(S.impression, totalMs, { metadata: { device } });
    participants.push(part);
    const sessionId = uuid();
    sessions.push({ id: sessionId, study_id: S.impression, participant_id: part.id, assignment_mode: "random_single", assigned_design_id: design.id, design_sequence: [design.id], device_type: device, user_agent: pick(DEVICES), viewport_width: vw, viewport_height: vh, started_at: started, completed_at: completed, total_time_ms: totalMs });
    const exposureId = uuid();
    const expStart = new Date(started.getTime() + 5000);
    const expEnd = new Date(started.getTime() + 5000 + exposureMs);
    const rendW = Math.min(vw, design.width);
    exposures.push({ id: exposureId, session_id: sessionId, study_id: S.impression, participant_id: part.id, design_id: design.id, exposure_sequence: 1, configured_duration_ms: 8000, actual_display_ms: exposureMs, countdown_duration_ms: 5000, countdown_started_at: started, exposure_started_at: expStart, exposure_ended_at: expEnd, questions_started_at: expEnd, questions_completed_at: completed, viewport_width: vw, viewport_height: vh, image_rendered_width: rendW, image_rendered_height: Math.round(rendW / design.width * design.height), used_mobile_image: false });
    events.push({ id: uuid(), exposure_id: exposureId, session_id: sessionId, study_id: S.impression, participant_id: part.id, phase: "exposure", question_id: null, event_type: "focus", timestamp_ms: 0, event_timestamp: expStart, event_data: {} });
    if (chance(0.3)) events.push({ id: uuid(), exposure_id: exposureId, session_id: sessionId, study_id: S.impression, participant_id: part.id, phase: "exposure", question_id: null, event_type: "blur", timestamp_ms: ri(2000, 6000), event_timestamp: new Date(started.getTime() + 7000), event_data: {} });
    const pushR = (qid: string, value: any) => responses.push({ id: uuid(), exposure_id: exposureId, session_id: sessionId, study_id: S.impression, participant_id: part.id, design_id: design.id, question_id: qid, response_value: value, response_time_ms: ri(1200, 9000), question_shown_at: expEnd, submitted_at: completed });
    pushR(qImpression, { optionId: good ? weighted<string>([["trust", 4], ["prof", 4], ["neutral", 2]]) : weighted<string>([["neutral", 3], ["confusing", 3], ["untrust", 2], ["prof", 1]]) });
    pushR(qWord, good ? pick(positiveWords) : pick(negativeWords));
    pushR(qAbout, pick(aboutAnswers));
    pushR(qAppeal, good ? ri(4, 5) : ri(2, 4));
  }
  insertRows("participants", participants, P_COLS, P_TYPES);
  insertRows("first_impression_sessions", sessions, ["id", "study_id", "participant_id", "assignment_mode", "assigned_design_id", "design_sequence", "device_type", "user_agent", "viewport_width", "viewport_height", "started_at", "completed_at", "total_time_ms"], { design_sequence: "jsonb" });
  insertRows("first_impression_exposures", exposures, ["id", "session_id", "study_id", "participant_id", "design_id", "exposure_sequence", "configured_duration_ms", "actual_display_ms", "countdown_duration_ms", "countdown_started_at", "exposure_started_at", "exposure_ended_at", "questions_started_at", "questions_completed_at", "viewport_width", "viewport_height", "image_rendered_width", "image_rendered_height", "used_mobile_image"]);
  insertRows("first_impression_interaction_events", events, ["id", "exposure_id", "session_id", "study_id", "participant_id", "phase", "question_id", "event_type", "timestamp_ms", "event_timestamp", "event_data"], { event_data: "jsonb" });
  insertRows("first_impression_responses", responses, ["id", "exposure_id", "session_id", "study_id", "participant_id", "design_id", "question_id", "response_value", "response_time_ms", "question_shown_at", "submitted_at"], { response_value: "jsonb" });
  process.stderr.write(`  first_impression: 100 participants/sessions, ${exposures.length} exposures, ${responses.length} answers, ${events.length} events\n`);
}

// =====================================================================
// 6. LIVE WEBSITE TEST (A/B variants)
// =====================================================================
function seedLiveWebsite() {
  const snippetId = uuid().slice(0, 11);
  const settings = {
    mode: "reverse_proxy", snippetId, trackingMode: "reverse_proxy",
    studyFlow: {
      welcome: { enabled: true, title: "Welcome", message: "<p>Thanks for helping us test our checkout experience. You'll complete a few short tasks on a live website.</p>" },
      thankYou: { enabled: true, title: "Thank You!", message: "<p>Your responses have been recorded. Thank you!</p>" },
      activityInstructions: { enabled: true, title: "Instructions", part1: "<p><strong>Here's how it works:</strong></p><ol><li>You'll be given tasks to complete on a live website.</li><li>Navigate as you normally would.</li><li>Follow the on-screen prompts when you finish each task.</li></ol><p><em>We're evaluating the website, not you!</em></p>" },
    },
  };
  makeStudy(S.live, "live_website_test", "E-Commerce Checkout Live Website Test", "Live website usability test on a real e-commerce site, running an A/B comparison of two checkout flows across four tasks with SEQ ratings and open feedback.", settings, "Compare two live checkout flows (standard vs express) on task success, ease, and drop-off.");

  const TARGET = "https://www.saucedemo.com";
  const variants = [
    { id: uuid(), study_id: S.live, name: "Variant A - Standard Checkout", position: 0, url: TARGET, weight: 50 },
    { id: uuid(), study_id: S.live, name: "Variant B - Express Checkout", position: 1, url: `${TARGET}/?flow=express`, weight: 50 },
  ];
  insertRows("live_website_variants", variants, ["id", "study_id", "name", "position", "url", "weight"]);

  const taskDefs = [
    { title: "Find And Open A Product", instr: "<p>Browse the store and open the product page for any backpack.</p>", crit: "self_reported", success: null, tl: 120 },
    { title: "Add Two Items To The Cart", instr: "<p>Add any two different products to your shopping cart.</p>", crit: "self_reported", success: null, tl: 180 },
    { title: "Complete The Checkout", instr: "<p>Proceed through checkout and reach the order confirmation page.</p>", crit: "exact_path", success: `${TARGET}/checkout-complete.html`, tl: 240 },
    { title: "Find The Return Policy", instr: "<p>Locate the store's return or refund policy information.</p>", crit: "self_reported", success: null, tl: 120 },
  ];
  const postQs = (n: number) => [
    { id: `t${n}-seq`, question_type: "opinion_scale", question_text: "Overall, how easy or difficult was this task?", is_required: true, position: 0, config: { scalePoints: 7, scaleType: "numbers", startAtZero: false, leftLabel: "Very difficult", middleLabel: "Neutral", rightLabel: "Very easy" } },
    { id: `t${n}-clear`, question_type: "yes_no", question_text: "Was it clear what to do next at each step?", is_required: true, position: 1, config: { styleType: "buttons" } },
    { id: `t${n}-improve`, question_type: "multi_line_text", question_text: "What, if anything, made this task harder than it should be?", is_required: false, position: 2, config: { placeholder: "Optional" } },
  ];
  const tasks = taskDefs.map((t, i) => ({ id: uuid(), study_id: S.live, title: t.title, instructions: t.instr, target_url: TARGET, success_url: t.success, success_criteria_type: t.crit, time_limit_seconds: t.tl, order_position: i, post_task_questions: postQs(i + 1) }));
  insertRows("live_website_tasks", tasks, ["id", "study_id", "title", "instructions", "target_url", "success_url", "success_criteria_type", "time_limit_seconds", "order_position", "post_task_questions"], { post_task_questions: "jsonb" });

  const feedbacks = ["The button placement was a little confusing.", "Took me a moment to find the cart icon.", "Checkout was smooth once I found the right button.", "The return policy was buried in the footer.", "Everything worked as expected.", "I expected a guest checkout option.", "The form validation messages were unclear.", ""];
  const successByTask = [0.9, 0.85, 0.7, 0.62];

  const participants: any[] = []; const pvars: any[] = []; const responses: any[] = []; const postResponses: any[] = []; const events: any[] = [];
  for (let p = 0; p < 100; p++) {
    const variant = chance(0.5) ? variants[0] : variants[1];
    const variantBoost = variant.name.includes("Express") ? 0.08 : 0;
    let totalDur = 0; const rows: any[] = [];
    tasks.forEach((task, ti) => {
      const status = weighted<"completed" | "abandoned" | "timed_out" | "skipped">([["completed", Math.min(0.96, successByTask[ti] + variantBoost)], ["abandoned", 0.08], ["timed_out", 0.04], ["skipped", 0.05]]);
      const completedOk = status === "completed";
      const dur = status === "timed_out" ? task.time_limit_seconds * 1000 : ri(12_000, task.time_limit_seconds * 900);
      totalDur += dur;
      const startedAt = new Date(NOW - rf(0.5, 30) * DAY);
      const completedAt = new Date(startedAt.getTime() + dur);
      const seq = completedOk ? ri(5, 7) : ri(1, 5);
      const method = completedOk ? (task.success_criteria_type === "exact_path" ? "auto_path_direct" : "self_reported") : status === "skipped" ? "skip" : status === "timed_out" ? "timeout" : "abandon";
      const fb = chance(completedOk ? 0.35 : 0.7) ? pick(feedbacks) : "";
      rows.push({ respId: uuid(), taskId: task.id, status, completedOk, seq, startedAt, completedAt, dur, method, fb, ti });
    });
    const part = mkParticipant(S.live, totalDur, { metadata: { device: pick(DEVICES) } });
    participants.push(part);
    pvars.push({ id: uuid(), participant_id: part.id, study_id: S.live, variant_id: variant.id });
    for (const rr of rows) {
      responses.push({ id: rr.respId, participant_id: part.id, task_id: rr.taskId, study_id: S.live, status: rr.status, self_reported_success: rr.completedOk, started_at: rr.startedAt, completed_at: rr.completedAt, duration_ms: rr.dur, seq_rating: rr.status === "skipped" ? null : rr.seq, open_ended_feedback: rr.fb || null, completion_method: rr.method, variant_id: variant.id });
      if (rr.status !== "skipped") {
        postResponses.push({ id: uuid(), response_id: rr.respId, study_id: S.live, participant_id: part.id, task_id: rr.taskId, question_id: `t${rr.ti + 1}-seq`, value: rr.seq });
        postResponses.push({ id: uuid(), response_id: rr.respId, study_id: S.live, participant_id: part.id, task_id: rr.taskId, question_id: `t${rr.ti + 1}-clear`, value: rr.completedOk ? chance(0.85) : chance(0.4) });
        if (rr.fb) postResponses.push({ id: uuid(), response_id: rr.respId, study_id: S.live, participant_id: part.id, task_id: rr.taskId, question_id: `t${rr.ti + 1}-improve`, value: rr.fb });
      }
      if (chance(0.4)) {
        const sid = uuid().slice(0, 16);
        const evtStart = rr.startedAt.getTime();
        events.push({ id: uuid(), study_id: S.live, participant_id: part.id, session_id: sid, task_id: rr.taskId, event_type: "page_view", element_selector: null, coordinates: null, viewport_size: { width: 1440, height: 900 }, page_url: TARGET, timestamp: new Date(evtStart + 500), metadata: {} });
        events.push({ id: uuid(), study_id: S.live, participant_id: part.id, session_id: sid, task_id: rr.taskId, event_type: "click", element_selector: "button.add-to-cart", coordinates: { x: ri(200, 1200), y: ri(200, 700) }, viewport_size: { width: 1440, height: 900 }, page_url: TARGET, timestamp: new Date(evtStart + ri(2000, 8000)), metadata: {} });
        if (rr.completedOk) events.push({ id: uuid(), study_id: S.live, participant_id: part.id, session_id: sid, task_id: rr.taskId, event_type: "navigation", element_selector: null, coordinates: null, viewport_size: { width: 1440, height: 900 }, page_url: `${TARGET}/cart.html`, timestamp: new Date(evtStart + ri(9000, 20000)), metadata: {} });
      }
    }
  }
  insertRows("participants", participants, P_COLS, P_TYPES);
  insertRows("live_website_participant_variants", pvars, ["id", "participant_id", "study_id", "variant_id"]);
  insertRows("live_website_responses", responses, ["id", "participant_id", "task_id", "study_id", "status", "self_reported_success", "started_at", "completed_at", "duration_ms", "seq_rating", "open_ended_feedback", "completion_method", "variant_id"]);
  insertRows("live_website_post_task_responses", postResponses, ["id", "response_id", "study_id", "participant_id", "task_id", "question_id", "value"], { value: "jsonb" });
  insertRows("live_website_events", events, ["id", "study_id", "participant_id", "session_id", "task_id", "event_type", "element_selector", "coordinates", "viewport_size", "page_url", "timestamp", "metadata"], { coordinates: "jsonb", viewport_size: "jsonb", metadata: "jsonb" });
  process.stderr.write(`  live_website: 100 participants, ${responses.length} task responses, ${postResponses.length} post-task, ${events.length} events\n`);
}

// =====================================================================
process.stderr.write("Building Feature Showcase SQL...\n");
emit("BEGIN;");
cleanup();
makeProject();
seedCardSort();
seedTreeTest();
seedSurvey();
seedFirstClick();
seedFirstImpression();
seedLiveWebsite();
emit("COMMIT;");
process.stdout.write(OUT.join("\n") + "\n");
process.stderr.write(`\nEmitted ${OUT.length} SQL statements.\n`);
