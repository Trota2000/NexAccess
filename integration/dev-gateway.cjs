// Local same-origin gateway: Expo stays responsible for routing and HMR.
// No tokens, request bodies, passwords or device keys are logged.
const http = require("node:http");
const https = require("node:https");
const backend = new URL(
  process.env.API_ORIGIN || "https://nexaccess.rattenkoenig.net",
);
const expo = new URL(process.env.EXPO_ORIGIN || "http://localhost:8091");
if (
  backend.protocol !== "https:" &&
  !["localhost", "127.0.0.1"].includes(backend.hostname)
)
  throw new Error("El backend remoto debe usar HTTPS.");
if (
  !["127.0.0.1", "localhost"].includes(expo.hostname) ||
  expo.protocol !== "http:"
)
  throw new Error("Expo debe ejecutarse en localhost.");
const port = Number(process.env.PORT || 8082);
const server = http.createServer((req, res) => {
  if (!req.url.startsWith("/") || req.url.startsWith("//")) {
    res.writeHead(400).end();
    return;
  }
  const upstream = req.url.startsWith("/api/") ? backend : expo;
  const headers = { ...req.headers, host: upstream.host };
  delete headers["cookie"];
  delete headers["x-device-key"];
  const request = (upstream.protocol === "https:" ? https : http).request(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || undefined,
      path: req.url,
      method: req.method,
      headers,
      timeout: 20000,
    },
    (response) => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    },
  );
  request.on("timeout", () => request.destroy());
  request.on("error", () => {
    if (!res.headersSent)
      res.writeHead(502, { "content-type": "application/problem+json" });
    res.end(
      JSON.stringify({
        detail: "No se pudo conectar con el servidor de destino.",
        code: "GATEWAY_UNAVAILABLE",
      }),
    );
  });
  req.on("aborted", () => request.destroy());
  req.pipe(request);
});
server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/api/")) {
    socket.destroy();
    return;
  }
  const proxy = http.request({
    hostname: expo.hostname,
    port: expo.port,
    path: req.url,
    headers: { ...req.headers, host: expo.host },
  });
  proxy.on("upgrade", (res, upstream, upstreamHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n${Object.entries(res.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\r\n")}\r\n\r\n`,
    );
    if (head.length) upstream.write(head);
    if (upstreamHead.length) socket.write(upstreamHead);
    upstream.pipe(socket).pipe(upstream);
    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
  });
  proxy.on("error", () => socket.destroy());
  proxy.end();
});
server.listen(port, "127.0.0.1", () =>
  console.log(`NexAccess web: http://localhost:${port} (Expo: ${expo.origin})`),
);
