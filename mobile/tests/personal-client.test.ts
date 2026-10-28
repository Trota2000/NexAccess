import { PersonalClient, sessionKey } from "../src/personal/client";
import { SecretStorage } from "../src/personal/storage";
import { profile } from "../src/personal/types";

function storage() {
  const data = new Map<string, string>();
  const store: SecretStorage = {
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => {
      data.set(key, value);
    },
    remove: async (key) => {
      data.delete(key);
    },
  };
  return { store, data };
}
const user = {
  id: 7,
  username: "empleado",
  role: "EMPLEADO",
  employeeId: 42,
  isActive: true,
};
const session = () => ({
  accessToken: "access-secret",
  tokenType: "Bearer",
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  refreshToken: "refresh-secret",
  sessionId: "device-session",
  user,
});
const ownProfile = {
  id: 42,
  fullName: "Ana P�rez",
  firstName: "Ana",
  lastName: "P�rez",
  documentNumber: "1234567",
  isActive: true,
};
function response(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    text: async () => (status === 204 ? "" : JSON.stringify(data)),
  } as unknown as Response;
}
test("browser-compatible transport is invoked without an ApiClient receiver", async () => {
  const transport = jest.fn(async function (this: unknown) {
    expect(this).not.toBeInstanceOf(PersonalClient);
    return response(session());
  });
  const client = new PersonalClient(
    "https://example.test/api/v1",
    storage().store,
    transport as unknown as typeof fetch,
  );
  await client.login("empleado", "password");
});
const mockTransport = (
  fn: (url: string, init?: RequestInit) => Promise<Response>,
) => jest.fn(fn) as unknown as jest.MockedFunction<typeof fetch>;

test("login preserves the exact password, stores only renewal material and rejects operator roles", async () => {
  const { store, data } = storage();
  const transport = mockTransport(async () => response(session()));
  const client = new PersonalClient(
    "https://example.test/api/v1",
    store,
    transport,
  );
  await client.login(" empleado ", " clave exacta ");
  expect(JSON.parse(String(transport.mock.calls[0][1]?.body))).toEqual({
    username: "empleado",
    password: " clave exacta ",
  });
  expect(data.get(sessionKey)).not.toContain("access-secret");
  expect(data.get(sessionKey)).not.toContain("clave exacta");
  expect(client.getSnapshot().user?.employeeId).toBe(42);
  const operator = new PersonalClient(
    "https://example.test/api/v1",
    storage().store,
    mockTransport(async () =>
      response({ ...session(), user: { ...user, role: "ADMIN" } }),
    ),
  );
  await expect(operator.login("admin", "password")).rejects.toMatchObject({
    code: "EMPLOYEE_ACCOUNT_REQUIRED",
  });
});

test("an unavailable mobile contract is never silently replaced with administrative login", async () => {
  const transport = mockTransport(async () => response({}, 404));
  const client = new PersonalClient(
    "https://example.test/api/v1",
    storage().store,
    transport,
  );
  await expect(client.login("empleado", "password")).rejects.toMatchObject({
    code: "MOBILE_API_PENDING",
  });
  expect(transport).toHaveBeenCalledTimes(1);
  expect(transport.mock.calls[0][0]).toContain("/auth/mobile/login");
});

test("restoring offline keeps the employee session and recovers without a second login", async () => {
  const { store, data } = storage();
  let online = true;
  const transport = mockTransport(async (url) => {
    if (!online) throw new Error("offline");
    return response(url.endsWith("/me") ? ownProfile : session());
  });
  await new PersonalClient(
    "https://example.test/api/v1",
    store,
    transport,
  ).login("empleado", "password");
  online = false;
  const restored = new PersonalClient(
    "https://example.test/api/v1",
    store,
    transport,
  );
  await restored.restore();
  expect(restored.getSnapshot().user?.id).toBe(7);
  expect(data.has(sessionKey)).toBe(true);
  online = true;
  await expect(restored.get("/me", profile)).resolves.toEqual(ownProfile);
});

test("concurrent requests renew once and rotate the stored refresh token", async () => {
  const { store, data } = storage();
  data.set(
    sessionKey,
    JSON.stringify({
      api: "https://example.test/api/v1",
      refreshToken: "old",
      sessionId: "device-session",
      user,
    }),
  );
  const transport = mockTransport(async (url) =>
    response(
      url.endsWith("/me")
        ? ownProfile
        : { ...session(), refreshToken: "rotated" },
    ),
  );
  const client = new PersonalClient(
    "https://example.test/api/v1",
    store,
    transport,
  );
  const restoring = client.restore();
  // Wait for saved-session hydration, while the same in-flight refresh is reused.
  while (!client.getSnapshot().ready) await Promise.resolve();
  await Promise.all([
    restoring,
    client.get("/me", profile),
    client.get("/me", profile),
  ]);
  expect(
    transport.mock.calls.filter(([url]) =>
      String(url).endsWith("/auth/mobile/refresh"),
    ),
  ).toHaveLength(1);
  expect(JSON.parse(data.get(sessionKey)!).refreshToken).toBe("rotated");
});

test("explicit refresh rejection disables NFC and clears the revoked session", async () => {
  const { store, data } = storage();
  data.set(
    sessionKey,
    JSON.stringify({
      api: "https://example.test/api/v1",
      refreshToken: "old",
      sessionId: "device-session",
      user,
    }),
  );
  const disable = jest.fn(async () => {});
  const client = new PersonalClient(
    "https://example.test/api/v1",
    store,
    mockTransport(async () => response({ code: "SESSION_REVOKED" }, 401)),
    disable,
  );
  await client.restore();
  expect(disable).toHaveBeenCalledTimes(1);
  expect(client.getSnapshot().user).toBeNull();
  expect(data.has(sessionKey)).toBe(false);
});

test("offline logout disables NFC first, clears the session and retries remote revocation", async () => {
  const { store, data } = storage();
  let online = true;
  const transport = mockTransport(async (url) => {
    if (!online) throw new Error("offline");
    return response(
      url.endsWith("logout") ? undefined : session(),
      url.endsWith("logout") ? 204 : 200,
    );
  });
  const disable = jest.fn(async () => {
    expect(data.has(sessionKey)).toBe(true);
  });
  const client = new PersonalClient(
    "https://example.test/api/v1",
    store,
    transport,
    disable,
  );
  await client.login("empleado", "password");
  online = false;
  await client.logout();
  expect(disable).toHaveBeenCalledTimes(1);
  expect(client.getSnapshot().user).toBeNull();
  expect(data.has(sessionKey)).toBe(false);
  expect(client.getSnapshot().notice).toContain("pendiente");
  online = true;
  await client.flushLogout();
  expect([...data.keys()]).toHaveLength(0);
});

test("employee scope cannot be replaced with administrative routes or an employeeId filter", async () => {
  const transport = mockTransport(async () => response(session()));
  const client = new PersonalClient(
    "https://example.test/api/v1",
    storage().store,
    transport,
  );
  await client.login("empleado", "password");
  await expect(client.get("/employees", profile)).rejects.toMatchObject({
    status: 400,
  });
  await expect(
    client.get("/me/access-events?employeeId=99", profile),
  ).rejects.toMatchObject({ status: 400 });
  expect(transport).toHaveBeenCalledTimes(1);
});

test("a late refresh cannot restore a session after logout", async () => {
  const { store } = storage();
  let resolveRefresh!: (response: Response) => void;
  const transport = mockTransport(async (url) => {
    if (url.endsWith("refresh"))
      return new Promise<Response>((resolve) => {
        resolveRefresh = resolve;
      });
    return response(
      url.endsWith("logout") ? undefined : session(),
      url.endsWith("logout") ? 204 : 200,
    );
  });
  const first = new PersonalClient(
    "https://example.test/api/v1",
    store,
    transport,
  );
  await first.login("empleado", "password");
  const restored = new PersonalClient(
    "https://example.test/api/v1",
    store,
    transport,
  );
  const restoring = restored.restore();
  while (!resolveRefresh) await Promise.resolve();
  await restored.logout();
  resolveRefresh(response(session()));
  await restoring;
  expect(restored.getSnapshot().user).toBeNull();
  expect(await store.get(sessionKey)).toBeNull();
});
