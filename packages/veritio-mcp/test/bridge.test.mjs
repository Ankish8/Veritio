import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const bin = fileURLToPath(new URL("../bin/veritio-mcp.mjs", import.meta.url));

async function runBridge(args = [], options = {}) {
  const child = spawn(process.execPath, [bin, ...args], {
    env: { ...process.env, ...options.env },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk) => {
    stderr += chunk;
  });
  if (options.stdin !== undefined) child.stdin.end(options.stdin);
  else child.stdin.end();
  const [code] = await once(child, "exit");
  return { code, stdout, stderr };
}

test("--help documents the bridge without requiring a key", async () => {
  const result = await runBridge(["--help"], { env: { VERITIO_API_KEY: "" } });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /--readonly/);
  assert.equal(result.stderr, "");
});

test("missing credentials fail closed", async () => {
  const result = await runBridge([], { env: { VERITIO_API_KEY: "" } });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /no API key/i);
  assert.equal(result.stdout, "");
});

test("forwards JSON-RPC, auth, readonly mode and feature selection", async (t) => {
  let received;
  const server = createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      received = {
        authorization: request.headers.authorization,
        body: JSON.parse(body),
        url: request.url,
      };
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({ jsonrpc: "2.0", id: 7, result: { ok: true } }),
      );
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const payload = { jsonrpc: "2.0", id: 7, method: "initialize", params: {} };
  const result = await runBridge(
    ["--readonly", "--features", "results,studies"],
    {
      env: {
        VERITIO_API_KEY: "vrt_test_key",
        VERITIO_URL: `http://127.0.0.1:${address.port}`,
      },
      stdin: `${JSON.stringify(payload)}\n`,
    },
  );

  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    jsonrpc: "2.0",
    id: 7,
    result: { ok: true },
  });
  assert.deepEqual(received, {
    authorization: "Bearer vrt_test_key",
    body: payload,
    url: "/mcp/readonly?features=results%2Cstudies",
  });
});

test("returns JSON-RPC parse errors without making a request", async () => {
  const result = await runBridge([], {
    env: { VERITIO_API_KEY: "vrt_test_key", VERITIO_URL: "http://127.0.0.1:1" },
    stdin: "not json\n",
  });
  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32700,
      message: "Parse error: stdin line was not valid JSON.",
    },
  });
});
