// Development-only API relay, copied to each Expo app by sync.cjs.
// Keeps /api/v1 out of Expo Router's HTML fallback. No secrets are stored/logged.
const http = require("node:http");
const https = require("node:https");
function createApiProxy(
  origin = process.env.API_ORIGIN || "https://nexaccess.rattenkoenig.net",
) {
  const backend = new URL(origin);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    backend.hostname,
  );
  if (
    backend.username ||
    backend.password ||
    backend.search ||
    backend.hash ||
    backend.pathname !== "/" ||
    !(
      backend.protocol === "https:" ||
      (backend.protocol === "http:" && loopback)
    )
  ) {
    throw new Error(
      "API_ORIGIN debe ser un origen HTTPS sin ruta ni credenciales; HTTP solo para localhost.",
    );
  }
  return function apiProxy(req, res, next) {
    if (!req.url?.startsWith("/api/v1/")) return next();
    const fail = () => {
      if (res.destroyed) return;
      if (res.headersSent) {
        res.destroy();
        return;
      }
      res.writeHead(502, {
        "content-type": "application/problem+json",
        "cache-control": "no-store",
      });
      res.end(
        JSON.stringify({
          detail: "No se pudo conectar con la API configurada.",
          code: "GATEWAY_UNAVAILABLE",
        }),
      );
    };
    if (
      loopback &&
      Number(backend.port || (backend.protocol === "https:" ? 443 : 80)) ===
        req.socket.localPort
    )
      return fail();
    const headers = {
      ...req.headers,
      host: backend.host,
      "accept-encoding": "identity",
    };
    delete headers.cookie;
    delete headers["x-device-key"];
    const request = (backend.protocol === "https:" ? https : http).request(
      {
        protocol: backend.protocol,
        hostname: backend.hostname,
        port: backend.port || undefined,
        path: req.url,
        method: req.method,
        headers,
        timeout: 15000,
      },
      (response) => {
        if (res.destroyed) {
          response.destroy();
          return;
        }
        res.writeHead(response.statusCode, {
          ...response.headers,
          "cache-control": "no-store",
        });
        response.on("error", fail);
        response.pipe(res);
      },
    );
    request.on("timeout", () => request.destroy());
    request.on("error", fail);
    req.on("aborted", () => request.destroy());
    res.on("close", () => {
      if (!res.writableFinished) request.destroy();
    });
    req.pipe(request);
  };
}
function withApiProxy(config, origin) {
  const previous = config.server.enhanceMiddleware;
  const proxy = createApiProxy(origin);
  config.server.enhanceMiddleware = (middleware, server) => {
    const rest = previous ? previous(middleware, server) : middleware;
    return (req, res, next) => proxy(req, res, () => rest(req, res, next));
  };
  return config;
}
module.exports = { createApiProxy, withApiProxy };
