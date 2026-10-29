// Local, disposable HTTP fixture. Never a production backend or an NFC simulation.
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const sessions = new Map();
const access = new Map();
const renewals = new Map();
const user = {
  id: 7,
  username: "empleado.demo",
  role: "EMPLEADO",
  employeeId: 42,
  isActive: true,
};
const now = Date.now();
const events = Array.from({ length: 43 }, (_, i) => ({
  id: 500 - i,
  employeeId: 42,
  occurredAt: new Date(now - (i * 5 + 1) * 3600000).toISOString(),
  result: i % 6 ? "AUTORIZADO" : "RECHAZADO",
  reason: i % 6 ? "AUTHORIZED" : "OUTSIDE_SCHEDULE",
  areaName: i % 2 ? "Acceso principal" : "Recepción",
  deviceCode: i % 2 ? "PUERTA-01" : "RECEPCION-02",
}));
function issue(sessionId) {
  const accessToken = randomUUID(),
    refreshToken = randomUUID();
  access.set(accessToken, sessionId);
  renewals.set(refreshToken, sessionId);
  return {
    accessToken,
    tokenType: "Bearer",
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    refreshToken,
    sessionId,
    user,
  };
}
function page(items, url) {
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get("pageSize") || 20)),
  );
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / pageSize),
  };
}
http
  .createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (["http://localhost:8097", "http://127.0.0.1:8097"].includes(origin))
      res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    function send(status, data) {
      res.writeHead(status);
      res.end(data === undefined ? undefined : JSON.stringify(data));
    }
    if (req.method === "OPTIONS") return send(204);
    const url = new URL(req.url, "http://localhost:8791");
    let text = "";
    for await (const chunk of req) {
      text += chunk;
      if (text.length > 10000) return send(413, {});
    }
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      return send(400, { detail: "JSON inválido." });
    }
    if (req.method === "POST" && url.pathname === "/api/v1/auth/mobile/login") {
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          body.installationId || "",
        )
      )
        return send(400, { detail: "installationId UUID es obligatorio." });
      if (
        body.username !== "empleado.demo" ||
        body.password !== "NexAccess2026!"
      )
        return send(401, {
          code: "INVALID_CREDENTIALS",
          detail: "Usuario o contraseña incorrectos.",
        });
      const id = randomUUID();
      sessions.set(id, true);
      return send(200, issue(id));
    }
    if (
      req.method === "POST" &&
      url.pathname.startsWith("/api/v1/auth/mobile/")
    ) {
      const id = renewals.get(body.refreshToken);
      if ((!id || !sessions.has(id)) && url.pathname.endsWith("/logout"))
        return send(204);
      if (!id || !sessions.has(id))
        return send(401, {
          code: "SESSION_REVOKED",
          detail: "Sesión de prueba revocada.",
        });
      renewals.delete(body.refreshToken);
      if (url.pathname.endsWith("/refresh")) return send(200, issue(id));
      if (url.pathname.endsWith("/logout")) {
        sessions.delete(id);
        return send(204);
      }
    }
    const sid = access.get(
      String(req.headers.authorization || "").replace(/^Bearer /, ""),
    );
    if (!sid || !sessions.has(sid))
      return send(401, { detail: "Iniciá sesión en la vista de prueba." });
    if (req.method === "GET" && url.pathname === "/api/v1/me")
      return send(200, {
        userId: user.id,
        username: user.username,
        role: "EMPLEADO",
        employeeId: 42,
        fullName: "Ana Martínez",
        isActive: true,
      });
    if (req.method === "GET" && url.pathname === "/api/v1/me/credentials")
      return send(
        200,
        page(
          [
            {
              id: 25,
              name: "Credencial móvil",
              type: "DIGITAL",
              maskedCode: "•••• A1B2",
              status: "ACTIVA",
              issuedAt: "2026-10-28T12:00:00Z",
              expiresAt: null,
            },
          ],
          url,
        ),
      );
    if (req.method === "GET" && url.pathname === "/api/v1/me/access-events")
      return send(
        200,
        page(
          events.filter(
            (item) =>
              (!url.searchParams.get("from") ||
                Date.parse(item.occurredAt) >=
                  Date.parse(url.searchParams.get("from"))) &&
              (!url.searchParams.get("to") ||
                Date.parse(item.occurredAt) <=
                  Date.parse(url.searchParams.get("to"))) &&
              (!url.searchParams.get("result") ||
                item.result === url.searchParams.get("result")),
          ),
          url,
        ),
      );
    send(404, { detail: "Ruta no disponible en la vista local de prueba." });
  })
  .listen(8791, "127.0.0.1", () =>
    console.log(
      "API de prueba LOCAL: http://localhost:8791/api/v1 · empleado.demo / NexAccess2026! · datos ficticios, sin NFC",
    ),
  );
