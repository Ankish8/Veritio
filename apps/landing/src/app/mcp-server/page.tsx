import type { Metadata } from "next";
import ArrowIcon from "@/components/ArrowIcon";
import FadeIn from "@/components/FadeIn";
import GuideLines from "@/components/GuideLines";
import LineTicker from "@/components/LineTicker";
import { withMarketingCanonical } from "@veritio/marketing-routes";

export const metadata: Metadata = withMarketingCanonical("/mcp-server", {
  title: "Veritio MCP Server | Bring UX Research Into Your AI Workflow",
  description:
    "Connect Veritio to Codex, Claude Code, Cursor, or VS Code. Create studies, inspect results, manage participants, and work with research through a secure remote MCP server.",
  openGraph: {
    title: "Veritio MCP Server",
    description:
      "Give your AI assistant secure access to the UX research workflows and evidence already in Veritio.",
    url: "https://veritio.io/mcp-server",
    siteName: "Veritio",
    type: "website",
  },
});

const SETUP_URL = "https://veritio.io/mcp/setup";

/* Single-path icon set. Each entry is the inner geometry of a 24x24 stroke icon. */
const iconPaths = {
  spark:
    "m12 2 1.4 4.6L18 8l-4.6 1.4L12 14l-1.4-4.6L6 8l4.6-1.4L12 2Z M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z",
  study: "M5 3.5h14v17H5zM8.5 8h7M8.5 12h7M8.5 16h4",
  configure: "M4 7h9M17 7h3M4 17h3M11 17h9M9 4.5v5M9 14.5v5",
  launch:
    "M14.5 5.5 18.5 2l.5 5.5-8.2 8.2-4.5-4.5 8.2-8.2Z M8.5 13.5l-3 1-2 6 6-2 1-3M14 8l3 3",
  results: "M4 20V11M10 20V4M16 20v-6M2.5 20h19",
  participants:
    "M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20M16.5 6.5a3 3 0 0 1 0 6M17.5 14.5a5 5 0 0 1 3.5 4.3V20",
  share: "m8.7 10.6 6.6-3.9M8.7 13.4l6.6 3.9",
  key: "m11 12 8-8M16 7l2 2M14 9l2 2",
  eye: "M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z",
  role: "M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Z M9.5 12.2 11 14l3.8-4",
  rotate:
    "M20.5 12a8.5 8.5 0 1 1-2.9-6.4M20.5 4v5h-5",
} as const;

type McpIconName = keyof typeof iconPaths;

/* Extra circles that stroke paths alone cannot express. */
const iconCircles: Partial<Record<McpIconName, Array<[number, number, number]>>> =
  {
    configure: [
      [15, 7, 2],
      [9, 17, 2],
    ],
    participants: [[9, 8.5, 3]],
    share: [
      [18, 5, 2.6],
      [6, 12, 2.6],
      [18, 19, 2.6],
    ],
    key: [[8, 15, 4]],
    eye: [[12, 12, 2.5]],
  };

function McpIcon({ name }: { name: McpIconName }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {iconPaths[name].split(" M").map((segment, index) => (
        <path key={segment} d={index === 0 ? segment : `M${segment}`} />
      ))}
      {iconCircles[name]?.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
      ))}
    </svg>
  );
}

const capabilities: Array<{
  icon: McpIconName;
  title: string;
  description: string;
}> = [
  {
    icon: "study",
    title: "Create the right study",
    description:
      "Turn a research question into a card sort, tree test, survey, first-click, first-impression, prototype, or live website study.",
  },
  {
    icon: "configure",
    title: "Configure the details",
    description:
      "Add tasks, questions, cards, tree nodes, study flow, and settings without leaving the conversation.",
  },
  {
    icon: "launch",
    title: "Validate before launch",
    description:
      "Check readiness, see exactly what is missing, and launch only after the study is ready and you approve it.",
  },
  {
    icon: "results",
    title: "Interrogate the evidence",
    description:
      "Ask for task metrics, participant responses, patterns, and concise result summaries in the same workspace as your analysis.",
  },
  {
    icon: "participants",
    title: "Work with participants",
    description:
      "Find panel members, inspect segments and tags, and keep recruitment context close to the study it supports.",
  },
  {
    icon: "share",
    title: "Move findings forward",
    description:
      "Manage study sharing, generate insights, create exports, and collaborate through comments, tags, recordings, and clips.",
  },
];

const steps = [
  {
    number: "01",
    title: "Add Veritio",
    description:
      "Choose Codex, Claude Code, Cursor, or VS Code and install the secure remote endpoint.",
  },
  {
    number: "02",
    title: "Approve access",
    description:
      "Sign in to the right workspace, choose full or read-only access, and review the requested scopes.",
  },
  {
    number: "03",
    title: "Ask naturally",
    description:
      "Work with studies and evidence from the conversation while Veritio enforces your existing permissions.",
  },
] as const;

const workflowPrompts = [
  {
    number: "01",
    label: "Study design",
    prompt:
      "Create a tree test from this sitemap, add the three navigation tasks, and tell me what is still required before launch.",
    result: "A configured study with an explicit readiness check.",
  },
  {
    number: "02",
    label: "Results analysis",
    prompt:
      "Compare task success and time-on-task across this first-click study. Summarize the strongest usability signal.",
    result: "Evidence-backed findings without exporting raw rows first.",
  },
  {
    number: "03",
    label: "Participant operations",
    prompt:
      "Find panel participants tagged enterprise and mobile, then show me the matching segments before I make any changes.",
    result: "A permission-aware shortlist you can review in context.",
  },
  {
    number: "04",
    label: "Research delivery",
    prompt:
      "Generate concise insights for this study and prepare an export I can share with the product team.",
    result: "A faster path from completed study to usable evidence.",
  },
] as const;

const trustControls: Array<{
  icon: McpIconName;
  title: string;
  description: string;
}> = [
  {
    icon: "key",
    title: "OAuth, not copied secrets",
    description:
      "Interactive clients open Veritio in your browser. Sign in once, review the requested access, and return to your AI tool.",
  },
  {
    icon: "eye",
    title: "A hard read-only option",
    description:
      "Choose the read-only endpoint when the assistant should analyze research without exposing any mutating tools.",
  },
  {
    icon: "role",
    title: "Workspace roles still apply",
    description:
      "A granted scope never overrides your role. Every call checks the relevant organization, project, study, or participant resource.",
  },
  {
    icon: "rotate",
    title: "Revocable, scoped access",
    description:
      "Veritio uses OAuth 2.1 with PKCE, short-lived access, rotating refresh tokens, and explicit research scopes.",
  },
];

const faqs = [
  {
    question: "What is an MCP server?",
    answer:
      "The Model Context Protocol is a standard way for AI assistants to use tools and approved data from another product. Veritio MCP makes research capabilities available through that shared interface instead of a custom integration for every AI client.",
  },
  {
    question: "Do I need to create an API key?",
    answer:
      "Not for normal interactive use. Codex, Claude Code, Cursor, and VS Code can connect through browser-based OAuth. Scoped API keys remain available for CI, headless automation, self-hosted environments, or older clients that cannot complete OAuth.",
  },
  {
    question: "Can my AI assistant change research data?",
    answer:
      "Only if you choose standard access and approve write scopes. Read-only mode removes mutating tools at the server boundary. Irreversible actions such as launching a study also run readiness checks and require explicit confirmation.",
  },
  {
    question: "Does MCP bypass Veritio permissions?",
    answer:
      "No. Scopes control the kind of action a credential may attempt, while Veritio separately checks the signed-in user’s role on the exact workspace, project, study, or panel resource involved in each call.",
  },
  {
    question: "Where does the MCP server run?",
    answer:
      "The recommended endpoint is hosted by Veritio over secure Streamable HTTP, so there is no local server to keep running. A published stdio bridge is available as a compatibility option for clients that cannot connect to a remote server directly.",
  },
] as const;

const clients = ["Codex", "Claude Code", "Cursor", "VS Code"] as const;

const toolCalls = [
  { icon: "study", name: "study_create", detail: "Tree test created", state: "Done" },
  {
    icon: "configure",
    name: "study_content_set",
    detail: "24 tree nodes added",
    state: "Done",
  },
  {
    icon: "role",
    name: "study_validate",
    detail: "Ready for your review",
    state: "Ready",
  },
] as const satisfies ReadonlyArray<{
  icon: McpIconName;
  name: string;
  detail: string;
  state: string;
}>;

export default function McpServerPage() {
  return (
    <main className="mcp-page">
      {/* ── HERO ── */}
      <section className="mcp-hero">
        <GuideLines />
        <div className="mcp-hero-shell">
          <FadeIn className="mcp-hero-copy">
            <span className="mcp-badge">
              <span className="mcp-badge-dot" aria-hidden="true" />
              Veritio MCP is live
            </span>
            <h1>Your AI assistant, now fluent in your research.</h1>
            <p className="mcp-hero-lede">
              Connect Veritio to the AI tools you already use. Create studies,
              inspect evidence, work with participants, and move findings
              forward without rebuilding context in every conversation.
            </p>
            <div className="mcp-hero-actions">
              <a className="mcp-btn mcp-btn-primary" href={SETUP_URL}>
                Connect Veritio MCP <ArrowIcon />
              </a>
              <a className="mcp-btn mcp-btn-ghost" href="#workflows">
                Explore workflows
              </a>
            </div>
            <ul className="mcp-hero-proof" aria-label="Connection highlights">
              <li>
                <span aria-hidden="true" /> Hosted remote server
              </li>
              <li>
                <span aria-hidden="true" /> OAuth setup
              </li>
              <li>
                <span aria-hidden="true" /> Full or read-only
              </li>
            </ul>
          </FadeIn>
        </div>

        <FadeIn className="mcp-showcase-wrap" delay={0.15}>
          <div className="mcp-showcase">
            <div className="mcp-showcase-card">
              <div className="mcp-demo">
                <div className="mcp-demo-bar">
                  <div className="mcp-demo-app">
                    <span aria-hidden="true" />
                    AI workspace
                  </div>
                  <span className="mcp-demo-status">
                    <i aria-hidden="true" /> Veritio connected
                  </span>
                </div>
                <div className="mcp-demo-body">
                  <div className="mcp-demo-ask">
                    <span>You</span>
                    <p>
                      Build a tree test from this sitemap and check it before
                      launch.
                    </p>
                  </div>
                  <div className="mcp-demo-reply">
                    <div className="mcp-demo-reply-head">
                      <McpIcon name="spark" /> Assistant
                    </div>
                    {toolCalls.map((call) => (
                      <div className="mcp-demo-call" key={call.name}>
                        <div className="mcp-demo-call-icon">
                          <McpIcon name={call.icon} />
                        </div>
                        <div>
                          <strong>{call.name}</strong>
                          <em>{call.detail}</em>
                        </div>
                        <b>{call.state}</b>
                      </div>
                    ))}
                    <p className="mcp-demo-out">
                      The study is configured and passes its readiness checks. I
                      have not launched it.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── CLIENTS ── */}
      <section className="mcp-clients" aria-labelledby="mcp-clients-heading">
        <GuideLines />
        <FadeIn className="mcp-clients-shell">
          <h2 id="mcp-clients-heading" className="mcp-clients-label">
            Connect from the tools already in your workflow
          </h2>
          <ul className="mcp-grid mcp-grid-4 mcp-clients-row">
            {clients.map((client) => (
              <li key={client}>
                <McpIcon name="spark" />
                {client}
              </li>
            ))}
          </ul>
        </FadeIn>
      </section>

      {/* ── CAPABILITIES ── */}
      <section className="mcp-section" aria-labelledby="capabilities-heading">
        <GuideLines />
        <div className="mcp-shell">
          <FadeIn className="mcp-head">
            <span className="mcp-badge">
              <span className="mcp-badge-dot" aria-hidden="true" />
              One research surface
            </span>
            <h2 id="capabilities-heading">
              Go from question to evidence in the same conversation.
            </h2>
            <p>
              Veritio exposes the real research workflow, not a read-only
              document search, while keeping every action behind scopes and
              resource-level permissions.
            </p>
          </FadeIn>
          <FadeIn>
            <div className="mcp-grid mcp-grid-3">
              {capabilities.map((capability) => (
                <article className="mcp-capability" key={capability.title}>
                  <div className="mcp-chip">
                    <McpIcon name={capability.icon} />
                  </div>
                  <div>
                    <h3>{capability.title}</h3>
                    <p>{capability.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <div className="mcp-ticker">
        <LineTicker direction="left" />
      </div>

      {/* ── HOW IT WORKS ── */}
      <section
        className="mcp-section mcp-steps-section"
        aria-labelledby="how-heading"
      >
        <GuideLines />
        <div className="mcp-shell">
          <FadeIn className="mcp-head">
            <span className="mcp-badge">
              <span className="mcp-badge-dot" aria-hidden="true" />
              Three steps
            </span>
            <h2 id="how-heading">Connect once. Keep the research context.</h2>
            <p>
              The recommended remote connection uses the MCP standard and opens
              Veritio in your browser for authentication. There is no local
              server to maintain and no API key to paste into an interactive
              client.
            </p>
          </FadeIn>
          <FadeIn>
            <ol className="mcp-grid mcp-grid-3">
              {steps.map((step) => (
                <li className="mcp-step" key={step.number}>
                  <span className="mcp-step-num" aria-hidden="true">
                    {step.number}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </FadeIn>
          <FadeIn className="mcp-steps-cta">
            <a className="mcp-btn mcp-btn-primary" href={SETUP_URL}>
              Open guided setup <ArrowIcon />
            </a>
            <span>Usually takes a minute. No API key required.</span>
          </FadeIn>
        </div>
      </section>

      {/* ── WORKFLOW PROMPTS ── */}
      <section
        id="workflows"
        className="mcp-section"
        aria-labelledby="workflows-heading"
      >
        <GuideLines />
        <div className="mcp-shell">
          <FadeIn className="mcp-head">
            <span className="mcp-badge">
              <span className="mcp-badge-dot" aria-hidden="true" />
              Try asking
            </span>
            <h2 id="workflows-heading">
              Prompts that end in real research work.
            </h2>
            <p>
              MCP lets the assistant move beyond advice. It can use authorized
              Veritio tools, show you what happened, and stop for review before
              consequential actions.
            </p>
          </FadeIn>
          <FadeIn>
            <div className="mcp-grid mcp-grid-2">
              {workflowPrompts.map((workflow) => (
                <article className="mcp-prompt" key={workflow.number}>
                  <div className="mcp-prompt-meta">
                    <span aria-hidden="true">{workflow.number}</span>
                    {workflow.label}
                  </div>
                  <blockquote>“{workflow.prompt}”</blockquote>
                  <p className="mcp-prompt-out">
                    <McpIcon name="spark" />
                    {workflow.result}
                  </p>
                </article>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── TRUST ── */}
      <section
        className="mcp-section mcp-trust-section"
        aria-labelledby="trust-heading"
      >
        <GuideLines />
        <div className="mcp-shell">
          <FadeIn className="mcp-head">
            <span className="mcp-badge">
              <span className="mcp-badge-dot" aria-hidden="true" />
              Designed for controlled access
            </span>
            <h2 id="trust-heading">
              Useful to your assistant. Still accountable to you.
            </h2>
            <p>
              Remote access should be easier without becoming invisible. Veritio
              keeps authentication, consent, scopes, and workspace roles in the
              path of every request.
            </p>
          </FadeIn>
          <FadeIn>
            <div className="mcp-grid mcp-grid-4">
              {trustControls.map((control) => (
                <article className="mcp-trust" key={control.title}>
                  <div className="mcp-chip">
                    <McpIcon name={control.icon} />
                  </div>
                  <div>
                    <h3>{control.title}</h3>
                    <p>{control.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </FadeIn>
          <FadeIn className="mcp-trust-note">
            <div className="mcp-chip">
              <McpIcon name="eye" />
            </div>
            <div>
              <strong>Need analysis without mutations?</strong>
              <p>
                The dedicated read-only endpoint never advertises create,
                update, launch, participant-write, sharing, or export tools.
              </p>
            </div>
            <a href={SETUP_URL}>
              Choose read-only setup <ArrowIcon />
            </a>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mcp-section" aria-labelledby="faq-heading">
        <GuideLines />
        <div className="mcp-shell">
          <div className="mcp-faq-layout">
            <FadeIn className="mcp-faq-intro">
              <span className="mcp-badge">
                <span className="mcp-badge-dot" aria-hidden="true" />
                Questions
              </span>
              <h2 id="faq-heading">Before you connect</h2>
              <p>
                The setup page includes exact instructions for each supported
                client. These are the important product and access details.
              </p>
            </FadeIn>
            <div className="mcp-faq-list">
              {faqs.map((faq) => (
                <details className="mcp-faq-item" key={faq.question}>
                  <summary>
                    {faq.question}
                    <span className="mcp-faq-plus" aria-hidden="true" />
                  </summary>
                  <div>
                    <p>{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="mcp-final-section" aria-labelledby="mcp-final-heading">
        <GuideLines />
        <div className="mcp-final-shell">
          <FadeIn>
            <div className="mcp-final-card">
              <span className="mcp-badge">
                <span className="mcp-badge-dot" aria-hidden="true" />
                Veritio MCP
              </span>
              <h2 id="mcp-final-heading">
                Put your research where the work is happening.
              </h2>
              <p>
                Connect your preferred AI client, approve the access you want,
                and start with a real study or result.
              </p>
              <div className="mcp-final-actions">
                <a className="mcp-btn mcp-btn-primary" href={SETUP_URL}>
                  Connect Veritio MCP <ArrowIcon />
                </a>
              </div>
              <p className="mcp-final-note">
                OAuth setup. No API key required. Revoke access any time.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  );
}
