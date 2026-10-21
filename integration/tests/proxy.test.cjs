const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createApiProxy, withApiProxy } = require("../metro-proxy.cjs");
async function serve(t, handler) {
  const server = http.createServer(handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  return `http://127.0.0.1:${server.address().port}`;
}
test("Metro API relay intercepts health and login before SPA HTML fallback", async (t) => {
  const requests = [];
  const backend = await serve(t, async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    requests.push({
      url: req.url,
      body,
      auth: req.headers.authorization,
      cookie: req.headers.cookie,
      deviceKey: req.headers["x-device-key"],
    });
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify(
        req.url.endsWith("/health")
          ? { status: "ok" }
          : { accessToken: "local-test-token", tokenType: "Bearer" },
      ),
    );
  });
  let previous = 0;
  const config = withApiProxy(
    {
      server: {
        enhanceMiddleware: (middleware) => {
          previous++;
          return middleware;
        },
      },
    },
    backend,
  );
  const handler = config.server.enhanceMiddleware((_req, res) => {
    res.setHeader("content-type", "text/html");
    res.end("<html>Expo</html>");
  });
  const metro = await serve(t, handler);
  assert.equal(previous, 1);
  const health = await fetch(metro + "/api/v1/health");
  assert.equal(health.headers.get("content-type"), "application/json");
  assert.deepEqual(await health.json(), { status: "ok" });
  const login = await fetch(metro + "/api/v1/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: "Bearer fake",
      Cookie: "not-for-backend=1",
      "X-DEVICE-KEY": "must-not-forward",
    },
    body: JSON.stringify({
      username: "fixture.admin",
      password: "LocalOnlyTesting!",
    }),
  });
  assert.equal((await login.json()).tokenType, "Bearer");
  assert.deepEqual(JSON.parse(requests[1].body), {
    username: "fixture.admin",
    password: "LocalOnlyTesting!",
  });
  assert.equal(requests[1].auth, "Bearer fake");
  assert.equal(requests[1].cookie, undefined);
  assert.equal(requests[1].deviceKey, undefined);
  const page = await fetch(metro + "/login");
  assert.equal(page.headers.get("content-type"), "text/html");
});
test("API errors keep their JSON status and query parameters", async (t) => {
  const backend = await serve(t, (req, res) => {
    assert.equal(req.url, "/api/v1/employees?page=2");
    res.writeHead(401, { "content-type": "application/problem+json" });
    res.end(JSON.stringify({ code: "UNAUTHORIZED", detail: "Token inválido" }));
  });
  const proxy = createApiProxy(backend);
  const metro = await serve(t, (req, res) =>
    proxy(req, res, () => {
      throw Error("Must not reach HTML fallback");
    }),
  );
  const response = await fetch(metro + "/api/v1/employees?page=2");
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "UNAUTHORIZED");
});
test("unavailable upstream returns JSON 502 instead of an Expo page", async (t) => {
  const offline = http.createServer();
  await new Promise((r) => offline.listen(0, "127.0.0.1", r));
  const port = offline.address().port;
  await new Promise((r) => offline.close(r));
  const proxy = createApiProxy(`http://127.0.0.1:${port}`);
  const metro = await serve(t, (req, res) =>
    proxy(req, res, () => {
      throw Error("No HTML fallback");
    }),
  );
  const response = await fetch(metro + "/api/v1/health");
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, "GATEWAY_UNAVAILABLE");
});
test("invalid upstream origins and accidental relay loops are rejected", async (t) => {
  for (const origin of [
    "http://remote.test",
    "https://user:pass@example.test",
    "https://example.test/path",
    "https://example.test/?token=x",
  ])
    assert.throws(() => createApiProxy(origin));
  let proxy;
  const metro = await serve(t, (req, res) => proxy(req, res, () => {}));
  proxy = createApiProxy(metro);
  const response = await fetch(metro + "/api/v1/health");
  assert.equal(response.status, 502);
});
