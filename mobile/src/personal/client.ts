import { z } from "zod";
import { randomUUID } from "expo-crypto";
import { normalizeBaseUrl } from "../api/client";
import { SecretStorage } from "./storage";
import {
  employeeUser,
  EmployeeUser,
  mobileSession,
  storedSession,
  StoredSession,
} from "./types";

export class PersonalApiError extends Error {
  constructor(
    message: string,
    readonly status = 0,
    readonly code = "NETWORK_ERROR",
  ) {
    super(message);
  }
}
export const sessionKey = "nexaccess.personal.session.v1";
export const installationKey = "nexaccess.personal.installation.v1";
const pendingKey = "nexaccess.personal.logout.v1";
type Snapshot = { ready: boolean; user: EmployeeUser | null; notice: string };

export class PersonalClient {
  readonly base: string;
  private saved: StoredSession | null = null;
  private token = "";
  private expires = 0;
  private epoch = 0;
  private refreshing?: Promise<void>;
  private restoring?: Promise<void>;
  private writes: Promise<void> = Promise.resolve();
  private installation?: Promise<string>;
  private signingOut = false;
  private logoutFlight?: Promise<void>;
  private snapshot: Snapshot = { ready: false, user: null, notice: "" };
  private listeners = new Set<() => void>();
  constructor(
    base: string,
    private storage: SecretStorage,
    private transport: typeof fetch = fetch,
    private disableNfc: () => Promise<void> = async () => {},
  ) {
    this.base = normalizeBaseUrl(base);
  }
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = () => this.snapshot;
  private publish(notice = "") {
    this.snapshot = {
      ready: true,
      user: this.signingOut ? null : (this.saved?.user ?? null),
      notice,
    };
    this.listeners.forEach((fn) => fn());
  }
  private persist(operation: () => Promise<void>): Promise<void> {
    const pending = this.writes.then(operation);
    this.writes = pending.catch(() => {});
    return pending;
  }
  private installationId(): Promise<string> {
    return (this.installation ??= (async () => {
      const saved = await this.storage.get(installationKey);
      if (saved && z.uuid().safeParse(saved).success) return saved;
      const next = randomUUID();
      await this.storage.set(installationKey, next);
      return next;
    })().catch((error) => {
      this.installation = undefined;
      throw error;
    }));
  }
  // Installation identifier only; never exposes refresh/access/NFC secrets.
  getInstallationId(): Promise<string> {
    return this.installationId();
  }
  private async raw(
    path: string,
    body?: unknown,
    token?: string,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const transport = this.transport;
      const response = await transport(`${this.base}${path}`, {
        method: body === undefined ? "GET" : "POST",
        signal: controller.signal,
        credentials: "omit",
        redirect: "error",
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const text = await response.text();
      let data: unknown;
      try {
        data =
          text && response.headers.get("content-type")?.includes("json")
            ? JSON.parse(text)
            : undefined;
      } catch {
        throw new PersonalApiError(
          "El servidor devolvió una respuesta inválida.",
          response.status,
          "CONTRACT_ERROR",
        );
      }
      if (!response.ok) {
        if (
          [404, 405, 501].includes(response.status) &&
          path.startsWith("/auth/mobile/")
        )
          throw new PersonalApiError(
            "El servidor todavía no tiene habilitado el acceso móvil de empleados.",
            response.status,
            "MOBILE_API_PENDING",
          );
        const problem = data as { detail?: string; code?: string } | undefined;
        throw new PersonalApiError(
          problem?.detail ||
            `No se pudo completar la consulta (${response.status}).`,
          response.status,
          problem?.code || "HTTP_ERROR",
        );
      }
      if (response.status === 204) return undefined;
      if (!data)
        throw new PersonalApiError(
          "La respuesta no corresponde a la API móvil. Revisá la configuración del servidor.",
          0,
          "CONTRACT_ERROR",
        );
      return data;
    } catch (error) {
      if (error instanceof PersonalApiError) throw error;
      throw new PersonalApiError(
        "Sin conexión con el servidor. Tu sesión se conserva; podés volver a intentar.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
  private parse<T>(schema: z.ZodType<T>, data: unknown): T {
    const parsed = schema.safeParse(data);
    if (!parsed.success)
      throw new PersonalApiError(
        "La respuesta del servidor no cumple el contrato de la app personal.",
        0,
        "CONTRACT_ERROR",
      );
    return parsed.data;
  }
  private async accept(data: unknown, epoch: number) {
    const next = this.parse(mobileSession, data);
    if (Date.parse(next.expiresAt) <= Date.now())
      throw new PersonalApiError(
        "El servidor devolvió un token vencido.",
        0,
        "CONTRACT_ERROR",
      );
    if (epoch !== this.epoch)
      throw new PersonalApiError("La sesión cambió.", 0, "STALE_REQUEST");
    if (
      this.saved &&
      (next.sessionId !== this.saved.sessionId ||
        next.user.id !== this.saved.user.id ||
        next.user.employeeId !== this.saved.user.employeeId)
    )
      throw new PersonalApiError(
        "La renovación devolvió una identidad distinta.",
        0,
        "CONTRACT_ERROR",
      );
    const saved: StoredSession = {
      api: this.base,
      refreshToken: next.refreshToken,
      sessionId: next.sessionId,
      user: next.user,
    };
    await this.persist(async () => {
      if (epoch !== this.epoch)
        throw new PersonalApiError("La sesión cambió.", 0, "STALE_REQUEST");
      if (this.signingOut)
        await this.storage.set(
          pendingKey,
          JSON.stringify({ api: this.base, refreshToken: saved.refreshToken }),
        );
      else await this.storage.set(sessionKey, JSON.stringify(saved));
      if (epoch !== this.epoch) {
        await this.storage.remove(sessionKey);
        throw new PersonalApiError("La sesión cambió.", 0, "STALE_REQUEST");
      }
      this.saved = saved;
      this.token = next.accessToken;
      this.expires = Date.parse(next.expiresAt);
      this.publish();
    });
  }
  async login(username: string, password: string) {
    if (this.signingOut || this.logoutFlight)
      throw new PersonalApiError(
        "Esperá a que termine el cierre de sesión anterior.",
      );
    if (!username.trim() || !password)
      throw new PersonalApiError("Ingresá tu usuario y contraseña.", 400);
    const epoch = ++this.epoch;
    await this.flushLogout();
    if (await this.storage.get(pendingKey))
      throw new PersonalApiError(
        "Falta confirmar el cierre de sesión anterior con el servidor. Revisá la conexión y volvé a intentar.",
      );
    const data = await this.raw("/auth/mobile/login", {
      username: username.trim(),
      password,
      installationId: await this.installationId(),
    });
    // Do not turn an administrative session into an employee session.
    const user = employeeUser.safeParse((data as { user?: unknown })?.user);
    if (!user.success)
      throw new PersonalApiError(
        "Esta app requiere una cuenta de empleado vinculada a tu ficha.",
        403,
        "EMPLOYEE_ACCOUNT_REQUIRED",
      );
    await this.accept(data, epoch);
  }
  restore(): Promise<void> {
    return (this.restoring ??= this.restoreOnce());
  }
  private async restoreOnce() {
    try {
      const closing = await this.storage.get(pendingKey);
      if (closing) {
        await this.disableNfc();
        await this.storage.remove(sessionKey);
        this.saved = null;
      }
      const value = closing ? null : await this.storage.get(sessionKey);
      if (value) {
        const parsed = storedSession.safeParse(JSON.parse(value));
        if (parsed.success && parsed.data.api === this.base)
          this.saved = parsed.data;
        else await this.storage.remove(sessionKey);
      }
      await this.flushLogout();
      this.publish();
      if (this.saved) {
        try {
          await this.refresh();
        } catch (error) {
          this.publish(
            error instanceof Error
              ? error.message
              : "No se pudo sincronizar la sesión.",
          );
        }
      }
    } catch {
      this.publish("No se pudo recuperar la sesión guardada de forma segura.");
    }
  }
  private refresh(): Promise<void> {
    if (this.refreshing) return this.refreshing;
    const epoch = this.epoch;
    const saved = this.saved;
    if (!saved)
      return Promise.reject(
        new PersonalApiError("Iniciá sesión para continuar.", 401),
      );
    const pending = (async () => {
      try {
        await this.accept(
          await this.raw("/auth/mobile/refresh", {
            refreshToken: saved.refreshToken,
          }),
          epoch,
        );
      } catch (error) {
        if (
          epoch === this.epoch &&
          !this.signingOut &&
          error instanceof PersonalApiError &&
          [401, 403].includes(error.status)
        ) {
          await this.disableNfc();
          ++this.epoch;
          this.saved = null;
          this.token = "";
          this.expires = 0;
          await this.persist(() => this.storage.remove(sessionKey));
          this.publish(
            "La sesión fue revocada o la cuenta está deshabilitada. Iniciá sesión nuevamente.",
          );
        }
        throw error;
      }
    })();
    this.refreshing = pending.finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  }
  async get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    if (this.signingOut)
      throw new PersonalApiError(
        "La sesión se está cerrando.",
        0,
        "STALE_REQUEST",
      );
    if (
      !/^\/me(?:\/(?:credentials(?:\/[1-9]\d*\/nfc)?|access-events))?(?:\?[^#]*)?$/.test(
        path,
      )
    )
      throw new PersonalApiError(
        "La consulta no pertenece a la app personal.",
        400,
      );
    const allowed = path.startsWith("/me/access-events?")
      ? ["page", "pageSize", "from", "to", "result"]
      : ["page", "pageSize"];
    for (const key of new URLSearchParams(path.split("?")[1] || "").keys())
      if (!allowed.includes(key))
        throw new PersonalApiError(
          "El filtro no pertenece al historial personal.",
          400,
        );
    const epoch = this.epoch;
    if (!this.token || this.expires <= Date.now() + 30000) await this.refresh();
    if (this.signingOut || epoch !== this.epoch)
      throw new PersonalApiError("La sesión cambió.", 0, "STALE_REQUEST");
    let data: unknown;
    try {
      data = await this.raw(path, undefined, this.token);
    } catch (error) {
      if (!(error instanceof PersonalApiError) || error.status !== 401)
        throw error;
      await this.refresh();
      data = await this.raw(path, undefined, this.token);
    }
    if (epoch !== this.epoch || this.signingOut)
      throw new PersonalApiError("La sesión cambió.", 0, "STALE_REQUEST");
    return this.parse(schema, data);
  }
  logout(): Promise<void> {
    return (this.logoutFlight ??= this.logoutOnce().finally(() => {
      this.logoutFlight = undefined;
    }));
  }
  private async logoutOnce() {
    await this.disableNfc();
    this.signingOut = true;
    const refreshing = this.refreshing;
    const saved = this.saved;
    // Persist revocation work before removing the session. HCE is already disabled.
    await this.persist(async () => {
      if (saved)
        await this.storage.set(
          pendingKey,
          JSON.stringify({
            api: this.base,
            refreshToken: saved.refreshToken,
          }),
        );
      await this.storage.remove(sessionKey);
    });
    this.publish("Cerrando sesión en este teléfono…");
    // A refresh already sent may have consumed the old token. Revoke with the latest returned token.
    try {
      await refreshing;
    } catch {
      /* Keep local logout even when renewal failed. */
    }
    ++this.epoch;
    const latest = this.saved;
    await this.persist(async () => {
      if (latest)
        await this.storage.set(
          pendingKey,
          JSON.stringify({ api: this.base, refreshToken: latest.refreshToken }),
        );
      await this.storage.remove(sessionKey);
    });
    this.saved = null;
    this.token = "";
    this.expires = 0;
    this.signingOut = false;
    this.publish();
    await this.flushLogout();
  }
  async flushLogout() {
    const value = await this.storage.get(pendingKey);
    if (!value) return;
    try {
      const pending = JSON.parse(value) as {
        api: string;
        refreshToken: string;
        sessionId: string;
      };
      if (pending.api !== this.base) return;
      await this.raw("/auth/mobile/logout", {
        refreshToken: pending.refreshToken,
      });
      await this.storage.remove(pendingKey);
    } catch (error) {
      // An already revoked refresh token also means the logout is complete.
      if (
        error instanceof PersonalApiError &&
        [401, 403].includes(error.status)
      )
        await this.storage.remove(pendingKey);
      else
        this.publish(
          "Sesión cerrada en este teléfono. La confirmación del servidor está pendiente de conexión.",
        );
    }
  }
}
