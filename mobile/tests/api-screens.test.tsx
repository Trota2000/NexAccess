import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import ApiApp from "../src/api/ApiApp";
import { Row, SystemRole } from "../src/api/client";
jest.setTimeout(20000);

let role: SystemRole;
let calls: { path: string; method: string; body?: Row }[];
const employee = {
  id: 12,
  documentNumber: "123456",
  firstName: "Ana",
  lastName: "Vera",
  fullName: "Ana Vera",
  isActive: true,
  roles: [],
};
function response(value: unknown, status = 200) {
  return {
    ok: status < 400,
    status,
    headers: { get: () => "application/json" },
    text: async () => JSON.stringify(value),
  } as unknown as Response;
}
const originalFetch = global.fetch;
beforeEach(() => {
  role = "ADMIN";
  calls = [];
  global.fetch = jest.fn(async (url, init) => {
    const path = String(url)
      .replace(/^.*\/api\/v1/, "")
      .split("?")[0];
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, method, body });
    if (path === "/auth/login")
      return response({
        accessToken: "local-ui-test-token",
        tokenType: "Bearer",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });
    if (path === "/auth/me")
      return response({
        id: 1,
        username: "test.operator",
        role,
        isActive: true,
        employeeId: null,
      });
    if (path === "/employees/12/roles") return response([]);
    if (path === "/employees/12") return response(employee);
    if (path === "/employees/12/roles/7")
      return response({
        ...employee,
        roles: [
          { id: 7, code: "PLANTA", name: "Personal de planta", isActive: true },
        ],
      });
    if (path === "/devices/4/rotate-key")
      return response({
        device: { id: 4, name: "Portón" },
        deviceKey: "ONCE-ONLY-LOCAL-TEST-KEY",
      });
    if (path === "/devices/4")
      return response({
        id: 4,
        code: "READER_4",
        name: "Portón",
        type: "ACCESO",
        isActive: true,
      });
    const items =
      path === "/employees"
        ? [employee]
        : path === "/devices"
          ? [
              {
                id: 4,
                code: "READER_4",
                name: "Portón",
                type: "ACCESO",
                isActive: true,
              },
            ]
          : [];
    return response({
      items,
      page: 1,
      pageSize: 20,
      totalItems: items.length,
      totalPages: items.length ? 1 : 0,
    });
  });
});
afterEach(() => {
  global.fetch = originalFetch;
});
async function login() {
  await render(<ApiApp />);
  await fireEvent.changeText(screen.getByLabelText("Usuario"), "test.operator");
  await fireEvent.changeText(
    screen.getByLabelText("Contraseña"),
    "LocalOnlyTesting!",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
  await screen.findByText("Ana Vera");
}
test("real login has no role selector or registration; obtains role from me", async () => {
  await login();
  expect(calls.slice(0, 2).map((c) => c.path)).toEqual([
    "/auth/login",
    "/auth/me",
  ]);
  expect(screen.queryByText("Perfil de demostración")).toBeNull();
  expect(screen.queryByText("Registrarse")).toBeNull();
  expect(
    screen.getByText("test.operator · ADMIN · Datos del servidor"),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
  expect(screen.getByLabelText("Contraseña").props.value).toBe("");
  expect(screen.queryByText("Ana Vera")).toBeNull();
});
test("RRHH sees attendance and employees but not security or administrative modules", async () => {
  role = "RRHH";
  await login();
  expect(screen.getByRole("button", { name: "Asistencia" })).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Historial de accesos" }),
  ).toBeNull();
  expect(screen.queryByRole("button", { name: "Auditoría" })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Cuentas de operadores" }),
  ).toBeNull();
});
test("SEGURIDAD assigns a physical role through the exact endpoint after confirmation", async () => {
  role = "SEGURIDAD";
  await login();
  expect(screen.queryByRole("button", { name: "Nuevo registro" })).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: "Ver detalle de Ana Vera" }),
  );
  await screen.findByRole("button", { name: "Asignar rol físico" });
  await fireEvent.press(
    screen.getByRole("button", { name: "Asignar rol físico" }),
  );
  await fireEvent.changeText(screen.getByLabelText("Rol físico"), "7");
  await fireEvent.press(
    screen.getByRole("button", { name: "Revisar cambios" }),
  );
  expect(
    calls.some((c) => c.method === "POST" && c.path.includes("/roles/")),
  ).toBe(false);
  await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));
  await waitFor(() =>
    expect(
      calls.some(
        (c) =>
          c.method === "POST" &&
          c.path === "/employees/12/roles/7" &&
          c.body === undefined,
      ),
    ).toBe(true),
  );
  await screen.findByText("El servidor confirmó la operación.");
});
test("device key is transient and only shown after confirmed rotation", async () => {
  await login();
  await fireEvent.press(
    screen.getByRole("button", { name: "Lectores y dispositivos" }),
  );
  await screen.findByText("Portón");
  await fireEvent.press(
    screen.getByRole("button", { name: "Ver detalle de Portón" }),
  );
  await screen.findByRole("button", { name: "Rotar clave del dispositivo" });
  await fireEvent.press(
    screen.getByRole("button", { name: "Rotar clave del dispositivo" }),
  );
  expect(screen.queryByText("ONCE-ONLY-LOCAL-TEST-KEY")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));
  await screen.findByText("ONCE-ONLY-LOCAL-TEST-KEY");
  await fireEvent.press(
    screen.getByRole("button", { name: "Ya guardé la clave" }),
  );
  expect(screen.queryByText("ONCE-ONLY-LOCAL-TEST-KEY")).toBeNull();
  expect(calls.filter((c) => c.path === "/devices/4/rotate-key")).toHaveLength(
    1,
  );
});
