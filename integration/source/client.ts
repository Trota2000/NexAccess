// Source of truth: sof2702/NexAccess, commit 81511f3 (DTOs + controllers).
export type SystemRole = "ADMIN" | "SEGURIDAD" | "RRHH";
export interface ApiUser {
  id: number;
  username: string;
  role: SystemRole;
  employeeId: number | null;
  isActive: boolean;
}
export interface Session {
  user: ApiUser;
  expiresAt: string;
}
export type Row = Record<string, unknown>;
export interface Page {
  items: Row[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = "NETWORK_ERROR",
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
export function id(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : /^\d+$/.test(String(value))
        ? Number(value)
        : NaN;
  if (!Number.isSafeInteger(n) || n < 1)
    throw new ApiError(
      "Seleccioná un identificador válido.",
      400,
      "INVALID_ID",
    );
  return n;
}
export function instant(value: string): string {
  // Never interpret an ambiguous local timestamp as UTC.
  if (
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,7})?)?(?:Z|[+-]\d\d:\d\d)$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new ApiError(
      "Ingresá fecha y hora ISO con zona, por ejemplo 2026-10-21T09:00:00-03:00.",
      400,
      "INVALID_DATE",
    );
  const datePart = value.slice(0, 10);
  const day = new Date(`${datePart}T00:00:00Z`);
  if (day.toISOString().slice(0, 10) !== datePart)
    throw new ApiError("La fecha no existe.", 400, "INVALID_DATE");
  return new Date(value).toISOString();
}
export function queryString(query: Row): string {
  return Object.entries(query)
    .filter(([, v]) => v !== "" && v !== undefined && v !== null)
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join("&");
}
export function normalizeBaseUrl(value: string): string {
  const base = value.trim().replace(/\/+$/, "");
  if (base === "/api/v1") return base;
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    throw new ApiError("La URL de la API no es válida.", 0, "CONFIG_ERROR");
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/api/v1" ||
    (parsed.protocol !== "https:" &&
      !(
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
      ))
  )
    throw new ApiError(
      "Usá HTTPS y la ruta /api/v1. HTTP solo se admite para pruebas en localhost.",
      0,
      "CONFIG_ERROR",
    );
  return base;
}
function parseJson(text: string): unknown {
  return JSON.parse(text, (_key, value) => {
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      !Number.isSafeInteger(value)
    )
      throw new ApiError(
        "La API devolvió un número fuera del rango seguro de JavaScript. Se requiere un contrato de IDs como cadenas.",
        0,
        "UNSAFE_NUMBER",
      );
    return value;
  });
}
export class ApiClient {
  private token?: string;
  private expiresAt = 0;
  private epoch = 0;
  private pending = new Set<AbortController>();
  onExpired?: () => void;
  subscribeExpiration(listener: () => void) {
    this.onExpired = listener;
    return () => {
      if (this.onExpired === listener) this.onExpired = undefined;
    };
  }
  readonly baseUrl: string;
  constructor(
    baseUrl: string,
    private transport: typeof fetch = fetch,
    private timeoutMs = 15000,
  ) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }
  logout(notify = false) {
    this.token = undefined;
    this.expiresAt = 0;
    this.epoch++;
    for (const request of this.pending) request.abort();
    this.pending.clear();
    if (notify) this.onExpired?.();
  }
  async login(username: string, password: string): Promise<Session> {
    this.logout();
    const version = this.epoch;
    const result = (await this.request("/auth/login", {
      method: "POST",
      body: { username: username.trim(), password },
      anonymous: true,
    })) as Row;
    if (
      !result ||
      typeof result.accessToken !== "string" ||
      result.tokenType !== "Bearer" ||
      typeof result.expiresAt !== "string" ||
      Date.parse(result.expiresAt) <= Date.now() ||
      !Number.isFinite(Date.parse(String(result.expiresAt)))
    )
      throw new ApiError(
        "La respuesta de inicio de sesión no cumple el contrato.",
        0,
        "CONTRACT_ERROR",
      );
    // Validate the user against /me rather than granting a role selected in the UI.
    const user = (await this.request("/auth/me", {
      candidateToken: result.accessToken,
      anonymous: true,
    })) as unknown as ApiUser;
    if (
      !user ||
      !["ADMIN", "SEGURIDAD", "RRHH"].includes(user.role) ||
      !user.isActive ||
      typeof user.username !== "string"
    )
      throw new ApiError(
        "La cuenta no tiene un perfil de operador compatible.",
        403,
        "INVALID_ROLE",
      );
    id(user.id);
    if (version !== this.epoch)
      throw new ApiError("La sesión cambió.", 0, "STALE_REQUEST");
    this.token = result.accessToken;
    this.expiresAt = Date.parse(result.expiresAt);
    return { user, expiresAt: result.expiresAt };
  }
  async request(
    path: string,
    options: {
      method?: string;
      body?: Row;
      query?: Row;
      anonymous?: boolean;
      candidateToken?: string;
      csv?: boolean;
    } = {},
  ): Promise<unknown> {
    if (!/^\/[a-z0-9/-]+$/.test(path))
      throw new ApiError("Ruta de API inválida.", 0, "INVALID_PATH");
    if (!options.anonymous && (!this.token || this.expiresAt <= Date.now())) {
      this.logout(true);
      throw new ApiError(
        "Tu sesión venció. Volvé a iniciar sesión.",
        401,
        "SESSION_EXPIRED",
      );
    }
    const version = this.epoch;
    const controller = new AbortController();
    this.pending.add(controller);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    try {
      const query = queryString(options.query ?? {});
      const token =
        options.candidateToken ?? (!options.anonymous ? this.token : undefined);
      // Browser fetch must be called without the ApiClient instance as its receiver.
      const transport = this.transport;
      const response = await transport(
        `${this.baseUrl}${path}${query ? `?${query}` : ""}`,
        {
          method: options.method ?? "GET",
          signal: controller.signal,
          credentials: "omit",
          redirect: "error",
          headers: {
            Accept: options.csv ? "text/csv" : "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        },
      );
      const text = await response.text();
      if (version !== this.epoch)
        throw new ApiError(
          "La sesión cambió; se descartó la respuesta.",
          0,
          "STALE_REQUEST",
        );
      const contentType = response.headers.get("content-type") ?? "";
      let data: unknown;
      if (text && contentType.includes("json")) {
        try {
          data = parseJson(text);
        } catch (error) {
          if (error instanceof ApiError) throw error;
          throw new ApiError(
            "La API devolvió JSON inválido.",
            response.status,
            "CONTRACT_ERROR",
          );
        }
      }
      if (!response.ok) {
        const problem = data && typeof data === "object" ? (data as Row) : {};
        if (response.status === 401 && !options.anonymous) this.logout(true);
        throw new ApiError(
          typeof problem.detail === "string"
            ? problem.detail
            : `La solicitud falló (${response.status}).`,
          response.status,
          String(problem.code ?? "HTTP_ERROR"),
          (problem.errors as Record<string, string[]>) ?? {},
        );
      }
      if (options.csv) {
        if (!contentType.includes("text/csv"))
          throw new ApiError(
            "El servidor no devolvió un archivo CSV.",
            0,
            "CONTRACT_ERROR",
          );
        return text;
      }
      if (response.status === 204) return undefined;
      if (contentType.toLowerCase().includes("text/html"))
        throw new ApiError(
          "La dirección de la API está devolviendo una página web. Reiniciá Expo para cargar el proxy actualizado o revisá la configuración del servidor.",
          response.status,
          "API_ROUTE_NOT_CONFIGURED",
        );
      if (!data || typeof data !== "object")
        throw new ApiError(
          "La respuesta de la API no cumple el contrato JSON.",
          0,
          "CONTRACT_ERROR",
        );
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        timedOut
          ? "La API demoró demasiado. Verificá el estado antes de repetir una escritura."
          : controller.signal.aborted
            ? "Solicitud cancelada."
            : "No se pudo conectar. Revisá la red, la URL y la configuración CORS del servidor.",
        0,
        timedOut ? "TIMEOUT" : "NETWORK_ERROR",
      );
    } finally {
      clearTimeout(timer);
      this.pending.delete(controller);
    }
  }
}
