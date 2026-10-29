import { setTheme } from "../src/api/Theme";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import ApiApp from "../src/api/ApiApp";
import { Row, SystemRole } from "../src/api/client";
jest.setTimeout(20000);

describe.each(["light", "dark"] as const)(
  "connected screens in %s theme",
  (mode) => {
    let role: SystemRole;
    let employeeWriteStatus: number;
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
      setTheme(mode);
      role = "ADMIN";
      employeeWriteStatus = 201;
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
        if (path === "/employees" && method === "POST")
          return employeeWriteStatus === 201
            ? response(
                {
                  ...employee,
                  ...body,
                  id: 41,
                  fullName: `${body.firstName} ${body.lastName}`,
                },
                201,
              )
            : response(
                {
                  detail: "Revisá el documento",
                  errors: { DocumentNumber: ["Documento duplicado"] },
                },
                employeeWriteStatus,
              );
        if (path === "/employees/12/roles") return response([]);
        if (path === "/employees/12") return response(employee);
        if (path === "/employees/12/roles/7")
          return response({
            ...employee,
            roles: [
              {
                id: 7,
                code: "PLANTA",
                name: "Personal de planta",
                isActive: true,
              },
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
        if (path === "/users")
          return response(
            method === "POST"
              ? { id: 17, ...body, isActive: true }
              : [
                  {
                    id: 17,
                    username: "fixture.account",
                    role: "SEGURIDAD",
                    employeeId: 12,
                    isActive: true,
                    webAccessEnabled: true,
                    mobileAccessEnabled: false,
                  },
                ],
            method === "POST" ? 201 : 200,
          );
        if (path === "/users/17/access")
          return response({
            id: 17,
            username: "fixture.account",
            role: "SEGURIDAD",
            employeeId: 12,
            isActive: true,
            ...body,
          });
        if (path === "/credentials/digital/12")
          return response(
            {
              id: 25,
              employeeId: 12,
              type: "DIGITAL",
              name: null,
              maskedCode: "••••1234",
              status: "ACTIVA",
              issuedAt: "2026-10-29T12:00:00Z",
              expiresAt: null,
            },
            201,
          );
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
    async function login(openEmployees = true) {
      await render(<ApiApp />);
      await fireEvent.changeText(
        screen.getByLabelText("Usuario"),
        "test.operator",
      );
      await fireEvent.changeText(
        screen.getByLabelText("Contraseña"),
        "LocalOnlyTesting!",
      );
      await fireEvent.press(
        screen.getByRole("button", { name: "Iniciar sesión" }),
      );
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Dashboard" }).props[
            "aria-current"
          ],
        ).toBe("page"),
      );
      await waitFor(() =>
        expect(screen.queryByLabelText("Cargando proceso")).toBeNull(),
      );
      if (openEmployees) {
        await fireEvent.press(
          screen.getByRole("button", { name: "Empleados" }),
        );
        await screen.findByText("Ana Vera");
      }
      await waitFor(() =>
        expect(screen.queryByLabelText("Cargando proceso")).toBeNull(),
      );
    }
    test("real login has no role selector or registration; obtains role from me", async () => {
      await login(false);
      expect(calls.slice(0, 2).map((c) => c.path)).toEqual([
        "/auth/login",
        "/auth/me",
      ]);
      expect(screen.queryByText("Perfil de demostración")).toBeNull();
      expect(
        screen.getByRole("button", { name: "Dashboard" }).props["aria-current"],
      ).toBe("page");
      expect(screen.queryByText("Registrarse")).toBeNull();
      expect(
        screen.queryByText("test.operator · ADMIN · Datos del servidor"),
      ).toBeNull();
      await fireEvent.press(
        screen.getByRole("button", { name: "Cerrar sesión" }),
      );
      expect(screen.getByLabelText("Contraseña").props.value).toBe("");
      expect(screen.queryByText("Ana Vera")).toBeNull();
    });
    test("admin creates an NFC-only account from its employee without granting web access", async () => {
      await login();
      await fireEvent.press(
        screen.getByRole("button", { name: "Ver detalle de Ana Vera" }),
      );
      await fireEvent.press(
        await screen.findByRole("button", {
          name: "Crear cuenta para este empleado",
        }),
      );
      await fireEvent.changeText(
        screen.getByLabelText("Usuario"),
        "empleado.demo",
      );
      await fireEvent.changeText(
        screen.getByLabelText("Contraseña inicial"),
        "Prueba-local-123",
      );
      await fireEvent.press(
        screen.getByRole("radio", { name: "EMPLEADO · app NFC" }),
      );
      expect(screen.getByLabelText("Acceso al panel web").props.value).toBe(
        false,
      );
      expect(screen.getByLabelText("Acceso a la app NFC").props.value).toBe(
        true,
      );
      await fireEvent.press(
        screen.getByRole("button", { name: "Revisar cambios" }),
      );
      await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() =>
        expect(
          calls.some((c) => c.path === "/users" && c.method === "POST"),
        ).toBe(true),
      );
      expect(
        calls.find((c) => c.path === "/users" && c.method === "POST")?.body,
      ).toMatchObject({
        role: "EMPLEADO",
        employeeId: 12,
        webAccessEnabled: false,
        mobileAccessEnabled: true,
      });
    });
    test("admin enables mobile access on a linked security account with the actual PUT DTO", async () => {
      await login(false);
      await fireEvent.press(
        screen.getByRole("button", { name: "Cuentas de operadores" }),
      );
      await fireEvent.press(
        await screen.findByRole("button", {
          name: "Ver detalle de fixture.account",
        }),
      );
      await fireEvent.press(
        screen.getByRole("button", { name: "Administrar acceso web / NFC" }),
      );
      await fireEvent(
        screen.getByLabelText("Acceso a la app NFC"),
        "valueChange",
        true,
      );
      await fireEvent.press(
        screen.getByRole("button", { name: "Revisar cambios" }),
      );
      await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() =>
        expect(
          calls.some(
            (c) => c.path === "/users/17/access" && c.method === "PUT",
          ),
        ).toBe(true),
      );
      expect(calls.find((c) => c.path === "/users/17/access")?.body).toEqual({
        webAccessEnabled: true,
        mobileAccessEnabled: true,
      });
    });
    test("digital issuance asks the server to generate the code instead of sending one", async () => {
      await login(false);
      await fireEvent.press(
        screen.getByRole("button", { name: "Credenciales RFID/NFC" }),
      );
      await fireEvent.press(
        await screen.findByRole("button", {
          name: "Emitir credencial digital",
        }),
      );
      await fireEvent.changeText(screen.getByLabelText("Empleado"), "12");
      await fireEvent.press(
        screen.getByRole("button", { name: "Revisar cambios" }),
      );
      expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
      expect(calls.some((c) => c.path === "/credentials/digital/12")).toBe(
        false,
      );
      await fireEvent.changeText(
        screen.getByLabelText("Instalación Android"),
        "f534312a-12cc-47dc-9d53-34ef801c99d7",
      );
      await fireEvent.press(
        screen.getByRole("button", { name: "Revisar cambios" }),
      );
      await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));
      await waitFor(() =>
        expect(calls.some((c) => c.path === "/credentials/digital/12")).toBe(
          true,
        ),
      );
      expect(
        calls.find((c) => c.path === "/credentials/digital/12")?.body,
      ).toEqual({
        installationId: "f534312a-12cc-47dc-9d53-34ef801c99d7",
        name: null,
        expiresAt: null,
      });
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
      expect(
        screen.queryByRole("button", { name: "Nuevo registro" }),
      ).toBeNull();
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
      await screen.findByRole("button", {
        name: "Rotar clave del dispositivo",
      });
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
      expect(
        calls.filter((c) => c.path === "/devices/4/rotate-key"),
      ).toHaveLength(1);
    });
    async function draftEmployee() {
      await fireEvent.press(
        screen.getByRole("button", { name: "Crear empleado" }),
      );
      await fireEvent.changeText(screen.getByLabelText("Documento"), "654321");
      await fireEvent.changeText(screen.getByLabelText("Nombres"), "Lucía");
      await fireEvent.changeText(screen.getByLabelText("Apellidos"), "Prueba");
      await fireEvent.press(
        screen.getByRole("button", { name: "Revisar cambios" }),
      );
      await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));
    }
    test("employee form rejects invalid characters and blocks malformed email before any write", async () => {
      await login();
      await fireEvent.press(
        screen.getByRole("button", { name: "Crear empleado" }),
      );
      await fireEvent.changeText(screen.getByLabelText("Documento"), "123abc");
      expect(screen.getByLabelText("Documento").props.value).toBe("");
      expect(screen.getByLabelText("Documento").props["aria-invalid"]).toBe(
        true,
      );
      await fireEvent.changeText(
        screen.getByLabelText("Documento"),
        "00123456",
      );
      await fireEvent.changeText(
        screen.getByLabelText("Nombres"),
        "María José",
      );
      await fireEvent.changeText(
        screen.getByLabelText("Apellidos"),
        "O’Connor-Pérez",
      );
      await fireEvent.changeText(
        screen.getByLabelText("Teléfono"),
        "0981letras",
      );
      expect(screen.getByLabelText("Teléfono").props.value).toBe("");
      await fireEvent.changeText(
        screen.getByLabelText("Teléfono"),
        "+595 (981) 123456",
      );
      await fireEvent.changeText(
        screen.getByLabelText("Correo"),
        "nombre@gmail",
      );
      await fireEvent.press(
        screen.getByRole("button", { name: "Revisar cambios" }),
      );
      expect(screen.getByLabelText("Correo").props["aria-invalid"]).toBe(true);
      expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
      expect(
        calls.filter((c) => c.method === "POST" && c.path === "/employees"),
      ).toHaveLength(0);
      await fireEvent.changeText(
        screen.getByLabelText("Correo"),
        "nombre@ficticio.net",
      );
      await fireEvent.press(
        screen.getByRole("button", { name: "Revisar cambios" }),
      );
      await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));
      await screen.findByText("Registro guardado · ID 41");
      expect(
        calls.find((c) => c.method === "POST" && c.path === "/employees")?.body,
      ).toEqual({
        documentNumber: "00123456",
        firstName: "María José",
        lastName: "O’Connor-Pérez",
        email: "nombre@ficticio.net",
        phone: "+595 (981) 123456",
      });
    });
    test("employee edit validates existing malformed data without sending a request", async () => {
      await login();
      await fireEvent.press(
        screen.getByRole("button", { name: "Ver detalle de Ana Vera" }),
      );
      await fireEvent.press(
        await screen.findByRole("button", { name: "Editar registro" }),
      );
      await fireEvent.changeText(
        screen.getByLabelText("Correo"),
        "texto sin arroba",
      );
      await fireEvent(screen.getByLabelText("Correo"), "blur");
      expect(screen.getByLabelText("Correo").props["aria-invalid"]).toBe(true);
      await fireEvent.press(
        screen.getByRole("button", { name: "Revisar cambios" }),
      );
      expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
      expect(calls.filter((c) => c.method === "PUT")).toHaveLength(0);
    });
    test("employee create sends the backend DTO and shows its server-assigned ID", async () => {
      await login();
      await draftEmployee();
      await screen.findByText("Registro guardado · ID 41");
      const created = calls.find(
        (c) => c.path === "/employees" && c.method === "POST",
      );
      expect(created?.body).toEqual({
        documentNumber: "654321",
        firstName: "Lucía",
        lastName: "Prueba",
        email: null,
        phone: null,
      });
      expect(
        screen.getByRole("button", { name: "Ver registro guardado" }),
      ).toBeTruthy();
    });
    test("server validation remains visible inside the reopened form with the submitted draft", async () => {
      employeeWriteStatus = 409;
      await login();
      await draftEmployee();
      await screen.findByText("Documento duplicado");
      expect(screen.getByLabelText("Documento").props.value).toBe("654321");
      expect(
        screen.getByRole("button", { name: "Revisar cambios" }),
      ).toBeTruthy();
      expect(screen.queryByText(/Registro guardado/)).toBeNull();
    });
    test("employee detail links to enrolment with employee ID prefilled", async () => {
      await login();
      await fireEvent.press(
        screen.getByRole("button", { name: "Ver detalle de Ana Vera" }),
      );
      await screen.findByRole("button", {
        name: "Enrolar tarjeta para este empleado",
      });
      await fireEvent.press(
        screen.getByRole("button", {
          name: "Enrolar tarjeta para este empleado",
        }),
      );
      expect(screen.getByLabelText("Empleado").props.value).toBe("12");
      expect(
        screen.getByRole("button", { name: "Revisar cambios" }),
      ).toBeTruthy();
    });
    test("an uncertain write stays blocked across navigation until the affected list is refreshed and reviewed", async () => {
      employeeWriteStatus = 500;
      await login();
      await draftEmployee();
      await screen.findByRole("button", {
        name: "Ya revisé el resultado; habilitar operaciones",
      });
      expect(
        screen.queryByRole("button", { name: "Crear empleado" }),
      ).toBeNull();
      expect(
        screen.getByRole("button", {
          name: "Ya revisé el resultado; habilitar operaciones",
        }).props.accessibilityState.disabled,
      ).toBe(true);
      await fireEvent.press(screen.getByRole("button", { name: "Dashboard" }));
      await screen.findByRole("checkbox", {
        name: "Mostrar Empleados activos",
      });
      await fireEvent.press(
        screen.getByRole("button", { name: /^Empleados$/ }),
      );
      await screen.findByText("Ana Vera");
      expect(
        screen.queryByRole("button", { name: "Crear empleado" }),
      ).toBeNull();
      await fireEvent.press(
        screen.getByRole("button", {
          name: "Ya revisé el resultado; habilitar operaciones",
        }),
      );
      expect(
        screen.getByRole("button", { name: "Crear empleado" }),
      ).toBeTruthy();
    });

    test("branded login shows a blocking loader and recovers after rejected credentials", async () => {
      let finish!: (r: Response) => void;
      global.fetch = jest.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      );
      await render(<ApiApp />);
      expect(screen.getByLabelText("NexAccess")).toBeTruthy();
      await fireEvent.changeText(
        screen.getByLabelText("Usuario"),
        "test.operator",
      );
      await fireEvent.changeText(
        screen.getByLabelText("Contraseña"),
        "LocalOnlyTesting!",
      );
      await fireEvent.press(
        screen.getByRole("button", { name: "Iniciar sesión" }),
      );
      expect(screen.getByLabelText("Cargando proceso")).toBeTruthy();
      expect(screen.getByLabelText("Símbolo de NexAccess")).toBeTruthy();
      await act(async () =>
        finish(response({ detail: "Credenciales incorrectas" }, 401)),
      );
      await waitFor(() =>
        expect(screen.queryByLabelText("Cargando proceso")).toBeNull(),
      );
      expect(screen.getByText("Credenciales incorrectas")).toBeTruthy();
      expect(screen.getByLabelText("Contraseña").props.value).toBe("");
      expect(
        screen.getByRole("button", { name: "Iniciar sesión" }).props
          .accessibilityState.disabled,
      ).toBe(false);
    });
    test("connection check uses the branded loader and restores the login", async () => {
      let finish!: (r: Response) => void;
      global.fetch = jest.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      );
      await render(<ApiApp />);
      await fireEvent.press(
        screen.getByRole("button", { name: "Comprobar conexión" }),
      );
      expect(screen.getByLabelText("Cargando proceso")).toBeTruthy();
      await act(async () => finish(response({ status: "ok" })));
      await waitFor(() =>
        expect(screen.queryByLabelText("Cargando proceso")).toBeNull(),
      );
      expect(screen.getByText("Servicio disponible.")).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Iniciar sesión" }).props
          .accessibilityState.disabled,
      ).toBe(false);
    });
  },
);
