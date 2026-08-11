import type { Metadata } from "next";
import ArrowIcon from "@/components/ArrowIcon";
import FadeIn from "@/components/FadeIn";
import GuideLines from "@/components/GuideLines";
import LineTicker from "@/components/LineTicker";

export const metadata: Metadata = {
  title: "Veritio MCP Server | Bring UX Research Into Your AI Workflow",
  description:
    "Connect Veritio to Codex, Claude Code, Cursor, or VS Code. Create studies, inspect results, manage participants, and work with research through a secure remote MCP server.",
  alternates: {
    canonical: "https://veritio.io/mcp-server",
  },
  openGraph: {
    title: "Veritio MCP Server",
    description:
      "Give your AI assistant secure access to the UX research workflows and evidence already in Veritio.",
    url: "https://veritio.io/mcp-server",
    siteName: "Veritio",
    type: "website",
  },
};

type McpIconName =
  | "spark"
  | "study"
  | "configure"
  | "launch"
  | "results"
  | "participants"
  | "share"
  | "shield"
  | "key"
  | "eye"
  | "role";

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
    icon: "shield",
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

function McpIcon({ name }: { name: McpIconName }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };

  if (name === "spark") {
    return (
      <svg {...common}>
        <path d="m12 2 1.4 4.6L18 8l-4.6 1.4L12 14l-1.4-4.6L6 8l4.6-1.4L12 2Z" />
        <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
        <path d="m5 13 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
      </svg>
    );
  }

  if (name === "study") {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }

  if (name === "configure") {
    return (
      <svg {...common}>
        <path d="M4 7h10M18 7h2M4 17h3M11 17h9M9 4v6M9 14v6" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="9" cy="17" r="2" />
      </svg>
    );
  }

  if (name === "launch") {
    return (
      <svg {...common}>
        <path d="M14.5 5.5 18.5 2l.5 5.5-8.2 8.2-4.5-4.5 8.2-8.2Z" />
        <path d="m8.5 13.5-3 1-2 6 6-2 1-3M14 8l3 3" />
      </svg>
    );
  }

  if (name === "results") {
    return (
      <svg {...common}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    );
  }

  if (name === "participants") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 6a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 4.9V20" />
      </svg>
    );
  }

  if (name === "share") {
    return (
      <svg {...common}>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
      </svg>
    );
  }

  if (name === "key") {
    return (
      <svg {...common}>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 8-8M16 7l2 2M14 9l2 2" />
      </svg>
    );
  }

  if (name === "eye") {
    return (
      <svg {...common}>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }

  if (name === "role") {
    return (
      <svg {...common}>
        <path d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Z" />
        <path d="M9.5 12.2 11 14l3.8-4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Z" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  );
}

export default function McpServerPage() {
  return (
    <main className="mcp-marketing-page">
      <section className="mcp-marketing-hero">
        <GuideLines />
        <div className="mcp-marketing-shell mcp-marketing-hero-grid">
          <FadeIn className="mcp-marketing-hero-copy">
            <div className="mcp-marketing-eyebrow">
              <McpIcon name="spark" /> Veritio MCP is live
            </div>
            <h1>Your AI assistant, now fluent in your research.</h1>
            <p className="mcp-marketing-hero-lede">
              Connect Veritio to the AI tools you already use. Create studies,
              inspect evidence, work with participants, and move findings
              forward without rebuilding context in every conversation.
            </p>
            <div className="mcp-marketing-actions">
              <a
                className="mcp-marketing-button mcp-marketing-button-primary"
                href="https://veritio.io/mcp/setup"
              >
                Connect Veritio MCP <ArrowIcon />
              </a>
              <a
                className="mcp-marketing-button mcp-marketing-button-secondary"
                href="#workflows"
              >
                Explore workflows
              </a>
            </div>
            <ul
              className="mcp-marketing-proof"
              aria-label="Connection highlights"
            >
              <li>
                <span /> Hosted remote server
              </li>
              <li>
                <span /> OAuth setup
              </li>
              <li>
                <span /> Full or read-only
              </li>
            </ul>
          </FadeIn>

          <FadeIn className="mcp-marketing-demo-wrap" delay={0.12}>
            <div className="mcp-marketing-demo">
              <div className="grid-pattern" />
              <div className="mcp-demo-window">
                <div className="mcp-demo-header">
                  <div>
                    <span className="mcp-demo-app-dot" />
                    <strong>AI workspace</strong>
                  </div>
                  <span className="mcp-demo-connected">
                    <i /> Veritio connected
                  </span>
                </div>
                <div className="mcp-demo-body">
                  <div className="mcp-demo-prompt">
                    <span>You</span>
                    <p>
                      Build a tree test from this sitemap and check it before
                      launch.
                    </p>
                  </div>
                  <div className="mcp-demo-agent">
                    <div className="mcp-demo-agent-label">
                      <McpIcon name="spark" /> Assistant
                    </div>
                    <div className="mcp-demo-tool-row">
                      <div className="mcp-demo-tool-icon">
                        <McpIcon name="study" />
                      </div>
                      <div>
                        <strong>study_create</strong>
                        <span>Tree test created</span>
                      </div>
                      <b>Done</b>
                    </div>
                    <div className="mcp-demo-tool-row">
                      <div className="mcp-demo-tool-icon">
                        <McpIcon name="configure" />
                      </div>
                      <div>
                        <strong>study_content_set</strong>
                        <span>24 tree nodes added</span>
                      </div>
                      <b>Done</b>
                    </div>
                    <div className="mcp-demo-tool-row">
                      <div className="mcp-demo-tool-icon">
                        <McpIcon name="shield" />
                      </div>
                      <div>
                        <strong>study_validate</strong>
                        <span>Ready for your review</span>
                      </div>
                      <b>Ready</b>
                    </div>
                    <p className="mcp-demo-answer">
                      The study is configured and passes its readiness checks. I
                      have not launched it.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section
        className="mcp-client-strip"
        aria-labelledby="mcp-clients-heading"
      >
        <div className="mcp-marketing-shell">
          <p id="mcp-clients-heading">
            Connect from the tools already in your workflow
          </p>
          <ul>
            {clients.map((client) => (
              <li key={client}>
                <span aria-hidden="true">✦</span>
                {client}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="mcp-marketing-section"
        aria-labelledby="capabilities-heading"
      >
        <GuideLines />
        <div className="mcp-marketing-shell">
          <FadeIn className="mcp-marketing-section-heading">
            <span className="mcp-marketing-kicker">One research surface</span>
            <h2 id="capabilities-heading">
              Go from question to evidence in the same conversation.
            </h2>
            <p>
              Veritio exposes the real research workflow—not a read-only
              document search—while keeping every action behind scopes and
              resource-level permissions.
            </p>
          </FadeIn>
          <div className="mcp-capability-grid">
            {capabilities.map((capability, index) => (
              <FadeIn key={capability.title} delay={index + 1}>
                <article className="mcp-capability-card">
                  <div className="mcp-card-icon">
                    <McpIcon name={capability.icon} />
                  </div>
                  <h3>{capability.title}</h3>
                  <p>{capability.description}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <div className="mcp-marketing-ticker">
        <LineTicker direction="left" />
      </div>

      <section
        className="mcp-marketing-section mcp-how-section"
        aria-labelledby="how-heading"
      >
        <GuideLines />
        <div className="mcp-marketing-shell">
          <FadeIn className="mcp-marketing-section-heading mcp-marketing-section-heading-wide">
            <span className="mcp-marketing-kicker">Three steps</span>
            <h2 id="how-heading">Connect once. Keep the research context.</h2>
            <p>
              The recommended remote connection uses the MCP standard and opens
              Veritio in your browser for authentication. There is no local
              server to maintain and no API key to paste into an interactive
              client.
            </p>
          </FadeIn>
          <ol className="mcp-how-grid">
            <li>
              <span className="mcp-step-number">01</span>
              <div className="mcp-step-icon">
                <McpIcon name="configure" />
              </div>
              <h3>Add Veritio</h3>
              <p>
                Choose Codex, Claude Code, Cursor, or VS Code and install the
                secure remote endpoint.
              </p>
            </li>
            <li>
              <span className="mcp-step-number">02</span>
              <div className="mcp-step-icon">
                <McpIcon name="key" />
              </div>
              <h3>Approve access</h3>
              <p>
                Sign in to the right workspace, choose full or read-only access,
                and review the requested scopes.
              </p>
            </li>
            <li>
              <span className="mcp-step-number">03</span>
              <div className="mcp-step-icon">
                <McpIcon name="spark" />
              </div>
              <h3>Ask naturally</h3>
              <p>
                Work with studies and evidence from the conversation while
                Veritio enforces your existing permissions.
              </p>
            </li>
          </ol>
          <FadeIn className="mcp-how-action">
            <a
              className="mcp-marketing-button mcp-marketing-button-primary"
              href="https://veritio.io/mcp/setup"
            >
              Open guided setup <ArrowIcon />
            </a>
            <span>Usually takes a minute. No API key required.</span>
          </FadeIn>
        </div>
      </section>

      <section
        id="workflows"
        className="mcp-marketing-section mcp-workflows-section"
        aria-labelledby="workflows-heading"
      >
        <GuideLines />
        <div className="mcp-marketing-shell mcp-workflows-layout">
          <FadeIn className="mcp-workflows-intro">
            <span className="mcp-marketing-kicker">Try asking</span>
            <h2 id="workflows-heading">
              Prompts that end in real research work.
            </h2>
            <p>
              MCP lets the assistant move beyond advice. It can use authorized
              Veritio tools, show you what happened, and stop for review before
              consequential actions.
            </p>
          </FadeIn>
          <div className="mcp-workflow-list">
            {workflowPrompts.map((workflow, index) => (
              <FadeIn key={workflow.number} delay={index + 1}>
                <article className="mcp-workflow-card">
                  <div className="mcp-workflow-meta">
                    <span>{workflow.number}</span>
                    {workflow.label}
                  </div>
                  <blockquote>“{workflow.prompt}”</blockquote>
                  <p>
                    <McpIcon name="spark" />
                    {workflow.result}
                  </p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section
        className="mcp-marketing-section mcp-trust-section"
        aria-labelledby="trust-heading"
      >
        <GuideLines />
        <div className="mcp-marketing-shell">
          <FadeIn className="mcp-trust-hero">
            <div>
              <span className="mcp-marketing-kicker mcp-marketing-kicker-dark">
                Designed for controlled access
              </span>
              <h2 id="trust-heading">
                Useful to your assistant. Still accountable to you.
              </h2>
            </div>
            <p>
              Remote access should be easier without becoming invisible. Veritio
              keeps authentication, consent, scopes, and workspace roles in the
              path of every request.
            </p>
          </FadeIn>
          <div className="mcp-trust-grid">
            {trustControls.map((control, index) => (
              <FadeIn key={control.title} delay={index + 1}>
                <article className="mcp-trust-card">
                  <div className="mcp-trust-icon">
                    <McpIcon name={control.icon} />
                  </div>
                  <h3>{control.title}</h3>
                  <p>{control.description}</p>
                </article>
              </FadeIn>
            ))}
          </div>
          <div className="mcp-trust-note">
            <McpIcon name="eye" />
            <div>
              <strong>Need analysis without mutations?</strong>
              <p>
                The dedicated read-only endpoint never advertises create,
                update, launch, participant-write, sharing, or export tools.
              </p>
            </div>
            <a href="https://veritio.io/mcp/setup">
              Choose read-only setup <ArrowIcon />
            </a>
          </div>
        </div>
      </section>

      <section
        className="mcp-marketing-section mcp-faq-section"
        aria-labelledby="faq-heading"
      >
        <GuideLines />
        <div className="mcp-marketing-shell mcp-faq-layout">
          <FadeIn className="mcp-faq-intro">
            <span className="mcp-marketing-kicker">Questions</span>
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
      </section>

      <section
        className="mcp-final-section"
        aria-labelledby="mcp-final-heading"
      >
        <GuideLines />
        <FadeIn className="mcp-marketing-shell">
          <div className="mcp-final-card">
            <div className="grid-pattern" />
            <div className="mcp-final-copy">
              <span className="mcp-marketing-kicker">Veritio MCP</span>
              <h2 id="mcp-final-heading">
                Put your research where the work is happening.
              </h2>
              <p>
                Connect your preferred AI client, approve the access you want,
                and start with a real study or result.
              </p>
            </div>
            <div className="mcp-final-actions">
              <a
                className="mcp-marketing-button mcp-marketing-button-primary"
                href="https://veritio.io/mcp/setup"
              >
                Connect Veritio MCP <ArrowIcon />
              </a>
              <a
                className="mcp-marketing-text-link"
                href="https://github.com/Ankish8/Veritio/blob/main/docs/MCP.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read technical documentation <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </FadeIn>
      </section>
    </main>
  );
}
