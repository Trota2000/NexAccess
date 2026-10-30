import {
  PersonalClient,
  sessionKey,
  installationKey,
} from "../src/personal/client";
import { SecretStorage } from "../src/personal/storage";
import { profile, nfcCredentialPayload } from "../src/personal/types";

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
  userId: 7,
  username: "empleado",
  role: "EMPLEADO",
  employeeId: 42,
  fullName: "Ana Pérez",
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

test("prepares only the installation-bound NFC payload without exposing it to UI or session storage", async () => {
  const { store, data } = storage();
  const configure = jest.fn(async () => {});
  const disable = jest.fn(async () => {});
  const transport = mockTransport(async (url) =>
    response(
      String(url).includes("/auth/")
        ? session()
        : {
            credentialId: 25,
            credential: "SYNTHETIC-NFC-CODE",
            expiresAt: null,
          },
    ),
  );
  const client = new PersonalClient(
    "https://example.test/api/v1",
    store,
    transport,
    disable,
    configure,
  );
  await client.login("empleado", "password");
  expect(await client.prepareNfc(25)).toBeUndefined();
  expect(configure).toHaveBeenCalledWith(25, "SYNTHETIC-NFC-CODE", null);
  expect(JSON.stringify(client.getSnapshot())).not.toContain(
    "SYNTHETIC-NFC-CODE",
  );
  expect([...data.values()].join()).not.toContain("SYNTHETIC-NFC-CODE");
  await client.logout();
  expect(disable).toHaveBeenCalled();
});

test("a mismatched NFC response clears the previous card instead of presenting it", async () => {
  const configure = jest.fn(async () => {});
  const disable = jest.fn(async () => {});
  const transport = mockTransport(async (url) =>
    response(
      String(url).includes("/auth/")
        ? session()
        : {
            credentialId: 999,
            credential: "SYNTHETIC",
            expiresAt: null,
          },
    ),
  );
  const client = new PersonalClient(
    "https://example.test/api/v1",
    storage().store,
    transport,
    disable,
    configure,
  );
  await client.login("empleado", "password");
  await expect(client.prepareNfc(25)).rejects.toMatchObject({
    code: "CONTRACT_ERROR",
  });
  expect(configure).not.toHaveBeenCalled();
  expect(disable).toHaveBeenCalledTimes(1);
});

test("an NFC response arriving after logout cannot reactivate the credential", async () => {
  let release!: (response: Response) => void;
  const deferred = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const configure = jest.fn(async () => {});
  const transport = mockTransport(async (url) =>
    String(url).endsWith("/nfc") ? deferred : response(session()),
  );
  const client = new PersonalClient(
    "https://example.test/api/v1",
    storage().store,
    transport,
    async () => {},
    configure,
  );
  await client.login("empleado", "password");
  const pending = client.prepareNfc(25);
  const rejected = expect(pending).rejects.toMatchObject({
    code: "STALE_REQUEST",
  });
  await client.logout();
  release(
    response({ credentialId: 25, credential: "SYNTHETIC", expiresAt: null }),
  );
  await rejected;
  expect(configure).not.toHaveBeenCalled();
});

test("NFC payload follows the current C# DTO rather than the manual field name", () => {
  expect(
    nfcCredentialPayload.safeParse({
      credentialId: 25,
      credential: "SYNTHETIC-NOT-A-REAL-CODE",
      expiresAt: null,
    }).success,
  ).toBe(true);
  expect(
    nfcCredentialPayload.safeParse({
      credentialId: 25,
      credentialCode: "SYNTHETIC-NOT-A-REAL-CODE",
      expiresAt: null,
    }).success,
  ).toBe(false);
});
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
    installationId: "f534312a-12cc-47dc-9d53-34ef801c99d7",
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
  expect([...data.keys()]).toEqual([installationKey]);
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
  const closing = restored.logout();
  while (restored.getSnapshot().user) await Promise.resolve();
  expect(await store.get(sessionKey)).toBeNull();
  resolveRefresh(response(session()));
  await Promise.all([restoring, closing]);
  expect(restored.getSnapshot().user).toBeNull();
  expect(await store.get(sessionKey)).toBeNull();
  const call = transport.mock.calls.find(([url]) =>
    String(url).endsWith("logout"),
  );
  expect(JSON.parse(String(call?.[1]?.body))).toEqual({
    refreshToken: "refresh-secret",
  });
});

test("installationId survives logout and is reused by the next login", async () => {
  const { store, data } = storage();
  const id = "953c687c-20b2-4b0e-a7ca-c51c8abc1111";
  data.set(installationKey, id);
  const transport = mockTransport(async (url) =>
    response(
      url.endsWith("logout") ? undefined : session(),
      url.endsWith("logout") ? 204 : 200,
    ),
  );
  const first = new PersonalClient(
    "https://example.test/api/v1",
    store,
    transport,
  );
  await first.login("empleado", "password");
  await first.logout();
  expect(await first.getInstallationId()).toBe(id);
  await new PersonalClient(
    "https://example.test/api/v1",
    store,
    transport,
  ).login("empleado", "password");
  const logins = transport.mock.calls.filter(([url]) =>
    String(url).endsWith("login"),
  );
  expect(
    logins.map(([, init]) => JSON.parse(String(init?.body)).installationId),
  ).toEqual([id, id]);
});

test("refresh and logout send the current backend DTO without sessionId", async () => {
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
      url.endsWith("logout")
        ? undefined
        : { ...session(), refreshToken: "rotated" },
      url.endsWith("logout") ? 204 : 200,
    ),
  );
  const client = new PersonalClient(
    "https://example.test/api/v1",
    store,
    transport,
  );
  await client.restore();
  await client.logout();
  const bodies = transport.mock.calls.map(([, init]) =>
    JSON.parse(String(init?.body)),
  );
  expect(bodies).toEqual([
    { refreshToken: "old" },
    { refreshToken: "rotated" },
  ]);
});
