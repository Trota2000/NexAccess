import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersonalClient } from "../src/personal/client";
import { SessionProvider } from "../src/personal/SessionProvider";
import PersonalCard from "../src/personal/Card";
import PersonalHistory from "../src/personal/History";
import PersonalLogin from "../src/personal/Login";
import { setTheme } from "../src/api/Theme";
jest.setTimeout(20000);

const user = {
  id: 1,
  employeeId: 42,
  username: "ana",
  role: "EMPLEADO",
  isActive: true,
};
const card = {
  id: 12,
  name: "Credencial m�vil",
  type: "DIGITAL",
  maskedCode: "���� A1B2",
  status: "ACTIVA",
  issuedAt: "2026-10-28T12:00:00Z",
  expiresAt: null,
};
const ownProfile = {
  id: 42,
  fullName: "Ana P�rez",
  firstName: "Ana",
  lastName: "P�rez",
  documentNumber: "1234567",
  isActive: true,
};
function setup(
  overrides: { employeeId?: number; empty?: boolean; fail?: boolean } = {},
) {
  const values = new Map<string, string>();
  const transport = jest.fn(async (url: string) => {
    const data = url.includes("/auth/mobile/")
      ? {
          accessToken: "test",
          tokenType: "Bearer",
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          refreshToken: "refresh",
          sessionId: "session",
          user,
        }
      : url.endsWith("/me")
        ? ownProfile
        : {
            items: overrides.empty
              ? []
              : url.includes("access-events")
                ? [
                    {
                      id: 1,
                      employeeId: overrides.employeeId ?? 42,
                      occurredAt: "2026-10-28T12:00:00Z",
                      result: "AUTORIZADO",
                      reason: "AUTHORIZED",
                      areaName: "Recepci�n",
                      deviceCode: "PUERTA-01",
                    },
                  ]
                : [card],
            page: 1,
            pageSize: 20,
            totalItems: overrides.empty ? 0 : 1,
            totalPages: overrides.empty ? 0 : 1,
          };
    return {
      ok: !overrides.fail,
      status: overrides.fail ? 404 : 200,
      headers: { get: () => "application/json" },
      text: async () => JSON.stringify(data),
    } as unknown as Response;
  });
  const client = new PersonalClient(
    "https://example.test/api/v1",
    {
      get: async (key) => values.get(key) ?? null,
      set: async (key, value) => {
        values.set(key, value);
      },
      remove: async (key) => {
        values.delete(key);
      },
    },
    transport as unknown as typeof fetch,
  );
  return { client, transport };
}
beforeEach(async () => {
  await AsyncStorage.clear();
  await act(async () => setTheme("light"));
});
afterEach(async () => {
  await act(async () => setTheme("light"));
});

test("personal card masks document, contains only personal controls and persists all three NFC preferences", async () => {
  const { client } = setup();
  await client.login("ana", "password");
  await render(
    <SessionProvider client={client}>
      <PersonalCard />
    </SessionProvider>,
  );
  expect(await screen.findByText("Ana P�rez")).toBeTruthy();
  expect(screen.queryByText("1234567")).toBeNull();
  expect(screen.queryByText("Dashboard")).toBeNull();
  expect(screen.getByText("Integraci�n NFC pendiente")).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "Modo NFC: Con pantalla desbloqueada" }),
  );
  expect(screen.getAllByRole("radio")).toHaveLength(3);
  await fireEvent.press(
    screen.getByRole("radio", { name: "Solo con la app abierta" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Modo NFC: Solo con la app abierta" }),
    ).toBeTruthy(),
  );
  expect(
    await AsyncStorage.getItem("nexaccess.personal.preferences.v1"),
  ).toContain('"nfcMode":"foreground"');
});

test("history renders the authenticated employee and filters without sending an employeeId", async () => {
  const { client, transport } = setup();
  await client.login("ana", "password");
  await render(
    <SessionProvider client={client}>
      <PersonalHistory />
    </SessionProvider>,
  );
  expect(await screen.findByText("Recepci�n")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Filtros" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Rechazados" }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Aplicar filtros" }),
  );
  await waitFor(() =>
    expect(
      transport.mock.calls.some(([url]) => url.includes("result=RECHAZADO")),
    ).toBe(true),
  );
  expect(
    transport.mock.calls.every(([url]) => !url.includes("employeeId=")),
  ).toBe(true);
});

test("a response containing another employee is discarded before rendering", async () => {
  const { client } = setup({ employeeId: 99 });
  await client.login("ana", "password");
  await render(
    <SessionProvider client={client}>
      <PersonalHistory />
    </SessionProvider>,
  );
  expect(
    await screen.findByText(
      "El historial recibido no corresponde a tu cuenta.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText("Recepci�n")).toBeNull();
});

test("empty history is different from a failed query", async () => {
  const { client } = setup({ empty: true });
  await client.login("ana", "password");
  await render(
    <SessionProvider client={client}>
      <PersonalHistory />
    </SessionProvider>,
  );
  expect(
    await screen.findByText("Todav�a no ten�s accesos registrados"),
  ).toBeTruthy();
});

test("theme changes and missing backend are clearly shown on the employee login", async () => {
  const { client } = setup({ fail: true });
  await render(
    <SessionProvider client={client}>
      <PersonalLogin />
    </SessionProvider>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Activar modo oscuro" }),
    ).toBeTruthy(),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Activar modo oscuro" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Activar modo claro" }),
    ).toBeTruthy(),
  );
  expect(
    await AsyncStorage.getItem("nexaccess.personal.preferences.v1"),
  ).toContain('"theme":"dark"');
  await fireEvent.changeText(screen.getByLabelText("Usuario"), "ana");
  await fireEvent.changeText(screen.getByLabelText("Contrase�a"), "password");
  await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesi�n" }));
  expect(
    await screen.findByText(
      "El servidor todav�a no tiene habilitado el acceso m�vil de empleados.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText("Registrarse")).toBeNull();
});
