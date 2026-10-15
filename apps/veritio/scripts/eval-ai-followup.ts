#!/usr/bin/env bun
/**
 * AI follow-up eval: runs a fixed set of realistic answers through the real
 * production path (rules, prompt, model, parser) and checks each decision.
 *
 *   bun --env-file=.env.local scripts/eval-ai-followup.ts [--runs 2] [--only <name>] [--delay 2500]
 *
 * Needs INCEPTION_API_KEY (and OPENAI_API_KEY for the fallback). Calls the
 * paid provider, so it is not part of the unit test suite. Run it after any
 * change to services/ai-followup/{prompt,rules,parse,completion}.ts.
 * Exits 1 if any case misses its expectation on any run.
 */

import { generateFollowup } from '../src/services/ai-followup/generate'
import { callFollowupModel } from '../src/services/ai-followup/completion'
import { AI_FOLLOWUP_EVAL_CASES } from './eval-ai-followup.cases'

const args = process.argv.slice(2)
const runs = Number(args[args.indexOf('--runs') + 1]) || 1
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
// Mercury's rate limit is low; pace calls so the eval measures quality, not throttling.
const delayMs = args.includes('--delay') ? Number(args[args.indexOf('--delay') + 1]) : 2500

if (!process.env.INCEPTION_API_KEY) {
  console.error('INCEPTION_API_KEY is not set. Run with: bun --env-file=.env.local scripts/eval-ai-followup.ts')
  process.exit(1)
}

const cases = AI_FOLLOWUP_EVAL_CASES.filter((c) => !only || c.name.includes(only))
let failures = 0
const latencies: number[] = []

for (let run = 1; run <= runs; run++) {
  if (runs > 1) console.log(`\n--- run ${run}/${runs}`)
  for (const testCase of cases) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    const started = Date.now()
    let error: string | null = null
    const result = await generateFollowup(testCase.input, {
      complete: (messages, max) => callFollowupModel(messages, max),
      onError: (e) => { error = e instanceof Error ? e.message : String(e) },
    })
    latencies.push(Date.now() - started)

    const asked = !!result
    const okDecision = testCase.expect === 'either' || (testCase.expect === 'ask') === asked
    const okMention = !result || !testCase.mentions || testCase.mentions.test(result.question)
    // A provider content-filter refusal means no follow-up, which is correct for 'skip'.
    const okError = !error || (testCase.expect === 'skip' && /content policy|filtered/i.test(error))
    const pass = okDecision && okMention && okError
    if (!pass) failures++

    const outcome = result ? `${result.modelUsed}: ${result.question}` : 'no follow-up'
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${testCase.name.padEnd(32)} expect=${testCase.expect.padEnd(6)} ${outcome}${error ? `  [error: ${error}]` : ''}`)
  }
}

latencies.sort((a, b) => a - b)
const p50 = latencies[Math.floor(latencies.length / 2)]
const p95 = latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))]
console.log(`\n${cases.length * runs - failures}/${cases.length * runs} passed  ·  latency p50 ${p50}ms  p95 ${p95}ms`)
process.exit(failures > 0 ? 1 : 0)
