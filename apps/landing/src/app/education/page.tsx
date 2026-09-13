import type { Metadata } from "next";
import type { ReactNode } from "react";
import ArrowIcon from "@/components/ArrowIcon";
import FadeIn from "@/components/FadeIn";
import GuideLines from "@/components/GuideLines";
import LineTicker from "@/components/LineTicker";
import RequestAccessForm from "@/components/education/RequestAccessForm";
import { withMarketingCanonical } from "@veritio/marketing-routes";
import {
  BudgetIcon,
  CardSortIcon,
  ChartIcon,
  ClickIcon,
  CodeIcon,
  CohortIcon,
  EyeIcon,
  SigmaIcon,
  SurveyIcon,
  TermIcon,
  TreeTestIcon,
} from "@/components/education/EduIcons";

export const metadata: Metadata = withMarketingCanonical("/education", {
  title: "Veritio for Education | UX Research Tools for Design Programmes",
  description:
    "Give an entire M.Des, B.Des, or HCI cohort card sorting, tree testing, surveys, usability and first-click testing on one license. Semester and academic-year terms, invoice or purchase order.",
  openGraph: {
    title: "Veritio for Education",
    description:
      "Every research method your design curriculum teaches, on one license a department can approve.",
    url: "https://veritio.io/education",
    siteName: "Veritio",
    type: "website",
  },
});

/* The hero artifact: a 14-week research methods module mapped onto the study
   types a cohort would actually run. Deliberately a curriculum document, not a
   mock of the product UI. */
const semesterPlan = [
  { weeks: "01 / 02", module: "Framing and sampling", method: "Survey" },
  { weeks: "03 / 05", module: "Information architecture", method: "Card Sort" },
  { weeks: "06 / 07", module: "Structure validation", method: "Tree Test" },
  { weeks: "08 / 10", module: "Evaluative testing", method: "Prototype Test" },
  { weeks: "11 / 12", module: "Visual judgment", method: "First Impression" },
  { weeks: "13 / 14", module: "Jury deliverable", method: "Insight report" },
] as const;

const programmes = [
  "M.Des Interaction Design",
  "B.Des UX / UI",
  "HCI and Computer Science",
  "Information Design",
  "Design Research",
  "Communication Design",
] as const;

type Cell = {
  icon: ReactNode;
  title: string;
  description: string;
};

const frictions: Cell[] = [
  {
    icon: <BudgetIcon />,
    title: "A studio of forty prices itself out",
    description:
      "Enterprise research platforms quote per seat and keep education pricing behind a sales call. By the time a number reaches the department, the term has started.",
  },
  {
    icon: <TermIcon />,
    title: "Trials expire mid-project",
    description:
      "A fourteen-day trial cannot carry a fourteen-week module. Students lose access to their own data somewhere around the midpoint review.",
  },
  {
    icon: <CardSortIcon />,
    title: "So methods get taught on paper",
    description:
      "Card sorting becomes sticky notes on a wall, tree testing gets skipped, and evaluative testing never produces a number a student can defend at a jury.",
  },
];

/* Module -> method -> deliverable. Every capability named here is verified in
   the product; nothing aspirational. */
const curriculum: Array<{
  icon: ReactNode;
  module: string;
  method: string;
  detail: string;
  output: string;
}> = [
  {
    icon: <SurveyIcon />,
    module: "Design Research Methods",
    method: "Survey",
    detail:
      "Thirteen question types including NPS, matrix, ranking, semantic differential, and constant sum, with branching logic, screening questions, and quotas.",
    output:
      "A screened sample and clean response data, cross-tabulated with chi-square or Fisher's exact and Cramér's V.",
  },
  {
    icon: <CardSortIcon />,
    module: "Information Architecture",
    method: "Card Sort",
    detail:
      "Open and closed sorts across a full cohort, analysed the way the literature does it rather than through a single opaque score.",
    output:
      "A similarity matrix, a dendrogram (Ward or UPGMA), and a PCA plot the student has to read and defend.",
  },
  {
    icon: <TreeTestIcon />,
    module: "Navigation and Structure",
    method: "Tree Test",
    detail:
      "Validate the structure the card sort produced, task by task, before anything gets designed.",
    output:
      "Findability and directness scores, lostness per task, a pie-tree, and the actual paths participants took.",
  },
  {
    icon: <ClickIcon />,
    module: "Usability Evaluation",
    method: "Prototype Test and Web App Test",
    detail:
      "Test any deployed URL with no code, or install a snippet on a live site for the studio's industry project.",
    output:
      "Click maps, misclick and backtrack rates, time on task, plus session replays and exportable video clips.",
  },
  {
    icon: <EyeIcon />,
    module: "Visual and Communication Design",
    method: "First Impression and First-Click",
    detail:
      "Put two design directions in front of real people instead of settling the argument in the crit room.",
    output:
      "A design comparison with chi-square, a p-value and a confidence level, plus first-click heat maps with area-of-interest overlays.",
  },
  {
    icon: <ChartIcon />,
    module: "Capstone, Diploma and Thesis",
    method: "Any method, plus insight reports",
    detail:
      "A graduation project can run several studies across a year and keep every result in one workspace.",
    output:
      "An AI insight report, a password-protected results link for the guide and jury, and CSV or PDF exports for the document.",
  },
];

const teachingFit: Cell[] = [
  {
    icon: <SigmaIcon />,
    title: "It shows its working",
    description:
      "Dendrograms, PCA, similarity matrices, findability and lostness, chi-square, Fisher's exact, Cramér's V. The method stays visible, so it can be taught, questioned, and graded rather than taken on faith.",
  },
  {
    icon: <CohortIcon />,
    title: "Every method on one license",
    description:
      "One platform covers the whole syllabus, from framing a sample in week one to a jury deliverable in week fourteen. No stitching together three vendors and three logins.",
  },
  {
    icon: <CodeIcon />,
    title: "Open source, and readable",
    description:
      "Veritio is AGPL-3.0. HCI and computer science students can read how findability and clustering are computed, and a department that needs participant data on university infrastructure can run its own instance.",
  },
  {
    icon: <TermIcon />,
    title: "Shaped like a term",
    description:
      "Access runs with the semester or the academic year instead of a rolling contract, and there are no per-response fees, so students can iterate rather than ration their sample.",
  },
];

/* Every education license grants exactly the same entitlements. Mirrors
   PLAN_ENTITLEMENTS.edu_* in apps/veritio/src/lib/plans.ts, which is the single
   source of truth. Do not add a capability here that is not in that matrix. */
const included: Array<{ title: string; description: string }> = [
  {
    title: "Unlimited responses per study",
    description:
      "Paid plans cap at 100 responses. A studio collecting data all term does not, so education licenses have no cap at all.",
  },
  {
    title: "Unlimited active studies",
    description:
      "Every student can have several studies running at once without anyone archiving work to free up a slot.",
  },
  {
    title: "All 7 study types",
    description:
      "Card sort, tree test, survey, first-click, first impression, prototype test, and live website test. Nothing is held back for a higher tier.",
  },
  {
    title: "Session recordings and clips",
    description:
      "Record real sessions, replay them with an event timeline, and export the moments that matter for a crit or a jury.",
  },
  {
    title: "AI insights and follow-up questions",
    description:
      "Generate insight reports, and let the study ask each participant a tailored follow-up. Runs on your own AI key.",
  },
  {
    title: "Real-time collaboration",
    description:
      "Student teams co-edit a study and share one results workspace, with roles, permissions, and comments.",
  },
];

/* The only thing that varies between licenses is how many students need an
   account: 40 / 200 / unlimited, matching the seats column of the edu_* plans. */
type Size = {
  name: string;
  seats: string;
  who: string;
  featured?: boolean;
};

const sizes: Size[] = [
  {
    name: "Classroom",
    seats: "Up to 40 students",
    who: "One course running a research module for a single cohort.",
  },
  {
    name: "Department",
    seats: "Up to 200 students",
    who: "Several courses and teaching staff across one programme.",
    featured: true,
  },
  {
    name: "Campus",
    seats: "Unlimited students",
    who: "A whole school of design, or every programme that needs it.",
  },
];

const steps = [
  {
    number: "01",
    title: "Tell us about the course",
    description:
      "Institution, programme, course name, cohort size, and when the term starts. One form, and we come back with the shape that fits.",
  },
  {
    number: "02",
    title: "We verify and provision",
    description:
      "We confirm the programme, raise an invoice or accept a purchase order, and have every student account ready before week one.",
  },
  {
    number: "03",
    title: "Teach with it",
    description:
      "Teaching staff get a walkthrough of each method and a semester plan you can adapt to your own module structure.",
  },
] as const;

const faqs = [
  {
    question: "Is Veritio free for universities?",
    answer:
      "No. Free academic tiers elsewhere come with seat queues, verification waits, and an upgrade conversation the moment a real cohort shows up. Education access is paid, priced per term rather than per seat, and quoted against your actual cohort size so the access lasts the whole module.",
  },
  {
    question: "Do you supply research participants?",
    answer:
      "No, Veritio has no participant panel. Students recruit by sharing a study link, or by importing their own contact list, with screening questions and quotas to control who qualifies. In a teaching context that is usually the point: finding and screening the right users is part of the method being assessed.",
  },
  {
    question: "How do students get their accounts?",
    answer:
      "You send us the cohort size and we provision the workspace before the term begins. Students sign in with their institutional email and work inside the shared cohort workspace, individually or in project teams.",
  },
  {
    question: "Can we run Veritio on our own servers?",
    answer:
      "Yes. Veritio is open source under AGPL-3.0, so a department that needs participant data to stay on university infrastructure can host its own instance. Deployment and upgrade support is included on the Campus tier.",
  },
  {
    question: "Can we pay by invoice or purchase order?",
    answer:
      "Yes. Card payment is available if it is simpler, but education access is built for institutional procurement: we issue an invoice against a purchase order and can supply the tax and vendor documentation your finance office needs.",
  },
  {
    question: "Can students keep their work after the term?",
    answer:
      "Yes. Studies and results export as CSV, and insight reports export as PDF, so a student can carry the evidence into a portfolio, a thesis document, or a jury presentation after the access period closes.",
  },
  {
    question: "Does Veritio import Figma prototypes?",
    answer:
      "Not yet. Figma prototype import is in development. Prototype testing today works by pasting any deployed URL, which covers a published Figma site, a Framer or Webflow build, or anything a student ships from Lovable, v0, Bolt, or Replit.",
  },
  {
    question: "We are a bootcamp, not a university. Does that count?",
    answer:
      "Usually yes. Continuing education providers and design bootcamps running a taught research module qualify on the same terms. Tell us the programme and the cohort size in the form and we will confirm.",
  },
] as const;

export default function EducationPage() {
  return (
    <main className="edu-page">
      {/* ── HERO ── */}
      <section className="edu-hero">
        <GuideLines />
        <div className="edu-hero-shell">
          <FadeIn className="edu-hero-copy">
            <span className="edu-badge">
              <span className="edu-badge-dot" aria-hidden="true" />
              Veritio for Education
            </span>
            <h1>Your students should graduate having run real studies.</h1>
            <p className="edu-hero-lede">
              Research platforms quote per seat and keep education pricing behind
              a sales call, so information architecture and usability end up
              taught from slide decks and paper cards. Veritio gives a whole
              cohort every method, on terms a department can approve.
            </p>
            <div className="edu-hero-actions">
              <a className="edu-btn edu-btn-primary" href="#request">
                Request access for my course <ArrowIcon />
              </a>
              <a className="edu-btn edu-btn-ghost" href="#curriculum">
                See the curriculum fit
              </a>
            </div>
            <ul className="edu-hero-proof" aria-label="Programme highlights">
              <li>
                <span aria-hidden="true" /> Semester and academic-year terms
              </li>
              <li>
                <span aria-hidden="true" /> All 7 methods on one license
              </li>
              <li>
                <span aria-hidden="true" /> Invoice or purchase order
              </li>
            </ul>
          </FadeIn>
        </div>

        <FadeIn className="edu-showcase-wrap" delay={0.15}>
          <div className="edu-showcase">
            <div className="edu-showcase-card">
              <div className="edu-syllabus">
                <div className="edu-syllabus-bar">
                  <div className="edu-syllabus-course">
                    <span aria-hidden="true" />
                    <div>
                      <strong>Design Research Methods</strong>
                      <em>M.Des Interaction Design, Semester 2</em>
                    </div>
                  </div>
                  <span className="edu-syllabus-pill">Studio of 38</span>
                </div>
                <div className="edu-syllabus-body">
                  <div className="edu-syllabus-head" aria-hidden="true">
                    <span>Weeks</span>
                    <span>Module</span>
                    <span>Runs in Veritio</span>
                  </div>
                  {semesterPlan.map((row) => (
                    <div className="edu-syllabus-row" key={row.weeks}>
                      <span className="edu-syllabus-weeks">{row.weeks}</span>
                      <span className="edu-syllabus-module">{row.module}</span>
                      <span className="edu-syllabus-method">{row.method}</span>
                    </div>
                  ))}
                  <p className="edu-syllabus-foot">
                    One license covers the full module. No tool changes at week
                    seven.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── PROGRAMMES ── */}
      <section className="edu-programmes" aria-labelledby="programmes-heading">
        <GuideLines />
        <FadeIn className="edu-programmes-shell">
          <h2 id="programmes-heading" className="edu-programmes-label">
            Built for the programmes that teach research as practice
          </h2>
          <ul className="edu-grid edu-grid-3 edu-programmes-row">
            {programmes.map((programme) => (
              <li key={programme}>{programme}</li>
            ))}
          </ul>
        </FadeIn>
      </section>

      {/* ── THE FRICTION ── */}
      <section className="edu-section" aria-labelledby="friction-heading">
        <GuideLines />
        <div className="edu-shell">
          <FadeIn className="edu-head">
            <span className="edu-badge">
              <span className="edu-badge-dot" aria-hidden="true" />
              The status quo
            </span>
            <h2 id="friction-heading">
              Every design school teaches these methods. Almost none get to run
              them.
            </h2>
            <p>
              The gap is not curriculum or capability. It is access, and it
              closes in three predictable ways.
            </p>
          </FadeIn>
          <FadeIn>
            <div className="edu-grid edu-grid-3">
              {frictions.map((friction) => (
                <article className="edu-cell" key={friction.title}>
                  <div className="edu-cell-icon">{friction.icon}</div>
                  <div className="edu-cell-text">
                    <h3>{friction.title}</h3>
                    <p>{friction.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <div className="edu-ticker">
        <LineTicker direction="left" />
      </div>

      {/* ── CURRICULUM MAP ── */}
      <section
        id="curriculum"
        className="edu-section"
        aria-labelledby="curriculum-heading"
      >
        <GuideLines />
        <div className="edu-shell">
          <FadeIn className="edu-head">
            <span className="edu-badge">
              <span className="edu-badge-dot" aria-hidden="true" />
              Curriculum fit
            </span>
            <h2 id="curriculum-heading">
              Your module list, and what students hand in.
            </h2>
            <p>
              Design research methods, information architecture, usability
              engineering, and the graduation project. Each one maps to a study
              a student can run this week and defend at the next review.
            </p>
          </FadeIn>
          <FadeIn>
            <div className="edu-map">
              <div className="edu-map-head" aria-hidden="true">
                <span>Course module</span>
                <span>Runs in Veritio</span>
                <span>Students walk away with</span>
              </div>
              {curriculum.map((row) => (
                <article className="edu-map-row" key={row.module}>
                  <div className="edu-map-module">
                    <div className="edu-cell-icon">{row.icon}</div>
                    <h3>{row.module}</h3>
                  </div>
                  <div className="edu-map-method">
                    <strong>{row.method}</strong>
                    <p>{row.detail}</p>
                  </div>
                  <div className="edu-map-output">
                    <span className="edu-map-label">Deliverable</span>
                    <p>{row.output}</p>
                  </div>
                </article>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── WHY IT FITS TEACHING ── */}
      <section className="edu-section" aria-labelledby="fit-heading">
        <GuideLines />
        <div className="edu-shell">
          <FadeIn className="edu-head">
            <span className="edu-badge">
              <span className="edu-badge-dot" aria-hidden="true" />
              Why it works in a classroom
            </span>
            <h2 id="fit-heading">A teaching tool has to show its working.</h2>
            <p>
              Industry tools optimise for a fast answer. A course needs the
              method visible, the data portable, and the access predictable for
              the length of the term.
            </p>
          </FadeIn>
          <FadeIn>
            <div className="edu-grid edu-grid-2">
              {teachingFit.map((item) => (
                <article className="edu-cell edu-cell-wide" key={item.title}>
                  <div className="edu-cell-icon">{item.icon}</div>
                  <div className="edu-cell-text">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── ACCESS TIERS (no pricing) ── */}
      <section
        id="access"
        className="edu-section"
        aria-labelledby="edu-access-heading"
      >
        <GuideLines />
        <div className="edu-shell">
          <FadeIn className="edu-head">
            <span className="edu-badge">
              <span className="edu-badge-dot" aria-hidden="true" />
              How access works
            </span>
            <h2 id="edu-access-heading">
              One license for the cohort. Nothing held back.
            </h2>
            <p>
              There is no good tier and better tier. Every education license
              unlocks the whole platform with no response caps, because a class
              cannot be told to ration its sample. The only variable is how many
              students need an account.
            </p>
          </FadeIn>
          <FadeIn>
            <div className="edu-grid edu-grid-3">
              {included.map((item) => (
                <article className="edu-included" key={item.title}>
                  <h3>
                    <span className="edu-included-mark" aria-hidden="true" />
                    {item.title}
                  </h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </FadeIn>

          <FadeIn className="edu-sizes-head">
            <h3>Then pick the size that matches your cohort</h3>
            <p>
              Seats can be topped up if enrolment grows mid-term, so start from
              the closest match rather than rounding up.
            </p>
          </FadeIn>
          <FadeIn>
            <div className="edu-sizes">
              {sizes.map((size) => (
                <article
                  className={`edu-size${size.featured ? " edu-size-featured" : ""}`}
                  key={size.name}
                >
                  <h4>{size.name}</h4>
                  <strong className="edu-size-seats">{size.seats}</strong>
                  <p>{size.who}</p>
                  <a className="edu-size-cta" href="#request">
                    Request access <ArrowIcon />
                  </a>
                </article>
              ))}
            </div>
          </FadeIn>

          <FadeIn className="edu-note">
            <div className="edu-note-icon">
              <TermIcon />
            </div>
            <div>
              <strong>Access runs to a date you choose</strong>
              <p>
                A license ends on a fixed date, one semester or one academic
                year, not on a rolling renewal. It is invoiced against a purchase
                order rather than billed to a card, and it never behaves like a
                trial.
              </p>
            </div>
          </FadeIn>

          <FadeIn className="edu-note">
            <div className="edu-note-icon">
              <CohortIcon />
            </div>
            <div>
              <strong>Working on a thesis on your own?</strong>
              <p>
                Individual students outside a licensed cohort can run studies on
                a standard plan, with a free trial and no card required.
              </p>
            </div>
            <a href="/pricing">
              See standard plans <ArrowIcon />
            </a>
          </FadeIn>
        </div>
      </section>

      {/* ── HOW TO START ── */}
      <section className="edu-section" aria-labelledby="edu-steps-heading">
        <GuideLines />
        <div className="edu-shell">
          <FadeIn className="edu-head">
            <span className="edu-badge">
              <span className="edu-badge-dot" aria-hidden="true" />
              Three steps
            </span>
            <h2 id="edu-steps-heading">Ready before week one.</h2>
            <p>
              Provisioning a cohort is an administrative task, not a
              negotiation. Most courses go from first email to working accounts
              inside a week.
            </p>
          </FadeIn>
          <FadeIn>
            <ol className="edu-grid edu-grid-3">
              {steps.map((step) => (
                <li className="edu-step" key={step.number}>
                  <span className="edu-step-num" aria-hidden="true">
                    {step.number}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </FadeIn>
        </div>
      </section>

      {/* ── REQUEST ACCESS ── */}
      <section
        id="request"
        className="edu-section"
        aria-labelledby="request-heading"
      >
        <GuideLines />
        <div className="edu-shell">
          <div className="edu-request-layout">
            <FadeIn className="edu-request-intro">
              <span className="edu-badge">
                <span className="edu-badge-dot" aria-hidden="true" />
                Request access
              </span>
              <h2 id="request-heading">Tell us about your course</h2>
              <p>
                Faculty, course coordinators, and programme heads can request
                access here. We reply with a quote for your cohort, the invoice
                or purchase order form, and a provisioning date.
              </p>
              <ul className="edu-request-points">
                <li>
                  <TermIcon />
                  <div>
                    <strong>One reply, not a sales sequence</strong>
                    We come back with the figure and the paperwork in the same
                    email.
                  </div>
                </li>
                <li>
                  <CohortIcon />
                  <div>
                    <strong>Verified programmes only</strong>
                    Use your institutional email so we can confirm the
                    programme.
                  </div>
                </li>
                <li>
                  <BudgetIcon />
                  <div>
                    <strong>Procurement friendly</strong>
                    We work to your finance office&apos;s process, including
                    purchase orders and vendor onboarding.
                  </div>
                </li>
              </ul>
            </FadeIn>
            <FadeIn delay={0.1}>
              <RequestAccessForm />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="edu-section" aria-labelledby="edu-faq-heading">
        <GuideLines />
        <div className="edu-shell">
          <div className="edu-faq-layout">
            <FadeIn className="edu-faq-intro">
              <span className="edu-badge">
                <span className="edu-badge-dot" aria-hidden="true" />
                Questions
              </span>
              <h2 id="edu-faq-heading">What faculty ask first</h2>
              <p>
                Straight answers, including the places where Veritio does less
                than the alternatives.
              </p>
            </FadeIn>
            <div className="edu-faq-list">
              {faqs.map((faq) => (
                <details className="edu-faq-item" key={faq.question}>
                  <summary>
                    {faq.question}
                    <span className="edu-faq-plus" aria-hidden="true" />
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
      <section className="edu-final-section" aria-labelledby="edu-final-heading">
        <GuideLines />
        <div className="edu-final-shell">
          <FadeIn>
            <div className="edu-final-card">
              <h2 id="edu-final-heading">
                Put the methods in your students&apos; hands this term.
              </h2>
              <p>
                Send us the course and the cohort size. We will have the
                workspace ready before your first studio session.
              </p>
              <div className="edu-final-actions">
                <a className="edu-btn edu-btn-primary" href="#request">
                  Request access for my course <ArrowIcon />
                </a>
              </div>
              <p className="edu-final-note">
                Semester and academic-year terms. Invoice or purchase order.
                Self-hosting available.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  );
}
