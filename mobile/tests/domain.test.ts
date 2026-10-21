import { can, credentialStatus, manualError } from "../src/utils/domain";
import { makeDemo } from "../src/data/mocks";
import { useDemo } from "../src/stores/demo";
const now = new Date("2026-10-20T15:00:00Z");
beforeEach(() => useDemo.setState({ data: makeDemo(), user: undefined }));
test("separa los roles físicos de los privilegios del sistema", () => {
  expect(can("EMPLEADO", "admin")).toBe(false);
  expect(can("RRHH", "security")).toBe(false);
  expect(can("SEGURIDAD", "hr")).toBe(false);
  expect(can("ADMIN", "admin")).toBe(true);
});
test("deriva los cuatro estados de credencial con prioridad de revocación", () => {
  const c = makeDemo().credentials[0];
  expect(credentialStatus({ ...c, expiresAt: undefined }, now)).toBe("ACTIVA");
  expect(
    credentialStatus({ ...c, active: false, expiresAt: undefined }, now),
  ).toBe("INACTIVA");
  expect(credentialStatus({ ...c, expiresAt: "2026-10-01" }, now)).toBe(
    "VENCIDA",
  );
  expect(credentialStatus({ ...c, revokedAt: "2026-09-01" }, now)).toBe(
    "REVOCADA",
  );
});
test("rechaza marcaciones futuras y fechas inválidas", () => {
  expect(
    manualError("e1", "2026-10-21T12:00:00Z", "Olvidó marcar", [], now),
  ).toMatch(/futuras/);
  expect(manualError("e1", "incorrecta", "Motivo", [], now)).toMatch(/válidas/);
});
test("exige motivo y respeta la ventana exacta de 60 segundos", () => {
  const records = [
    {
      ...makeDemo().attendance[0],
      employeeId: "e1",
      at: "2026-10-20T14:00:00Z",
    },
  ];
  expect(
    manualError("e1", "2026-10-20T14:00:59Z", "Motivo", records, now),
  ).toMatch(/60 segundos/);
  expect(
    manualError("e1", "2026-10-20T14:01:00Z", "Motivo", records, now),
  ).toBeUndefined();
  expect(manualError("e1", "2026-10-20T14:01:00Z", " ", records, now)).toMatch(
    /motivo/,
  );
});
test("datos de demostración conservan relaciones válidas", () => {
  const d = makeDemo();
  d.events.forEach((e) => {
    expect(d.employees.some((x) => x.id === e.employeeId)).toBe(true);
    expect(d.credentials.some((x) => x.id === e.credentialId)).toBe(true);
    expect(d.areas.some((x) => x.id === e.areaId)).toBe(true);
  });
  d.permissions.forEach((p) =>
    expect(d.accessRoles.some((r) => r.id === p.accessRoleId)).toBe(true),
  );
});
test("login exige el usuario del perfil y no acepta contraseña equivocada", () => {
  expect(useDemo.getState().login("admin", "incorrecta", "ADMIN")).toBe(false);
  expect(useDemo.getState().login("admin", "NexAccess2026!", "RRHH")).toBe(
    false,
  );
  expect(
    useDemo.getState().login("empleado", "NexAccess2026!", "EMPLEADO"),
  ).toBe(true);
});
test("empleado no puede mutar datos administrativos mediante el store", () => {
  const store = useDemo.getState();
  store.login("empleado", "NexAccess2026!", "EMPLEADO");
  expect(store.toggle("areas", "a1")).toMatch(/no permite/);
  expect(store.savePermission(makeDemo().permissions[0])).toMatch(/No tenés/);
  expect(
    store.correct({
      employeeId: "e1",
      at: "2026-01-01T08:00:00Z",
      type: "ENTRADA",
      note: "Prueba",
    }),
  ).toMatch(/no permite/);
});
test("RRHH registra corrección y auditoría y rechaza duplicados", () => {
  const store = useDemo.getState();
  store.login("rrhh", "NexAccess2026!", "RRHH");
  const mark = {
    employeeId: "e1",
    at: "2026-01-01T08:00:00Z",
    type: "ENTRADA" as const,
    note: "Marcación omitida",
  };
  expect(store.correct(mark)).toBeUndefined();
  expect(useDemo.getState().data.audit[0].action).toBe("MANUAL_MARK");
  expect(store.correct(mark)).toMatch(/60 segundos/);
});
test("las notificaciones ajenas no se marcan como leídas", () => {
  const store = useDemo.getState();
  store.login("empleado", "NexAccess2026!", "EMPLEADO");
  store.markRead(["n0", "n11"]);
  expect(
    useDemo.getState().data.notifications.find((n) => n.id === "n0")?.readBy,
  ).toContain("u1");
  expect(
    useDemo.getState().data.notifications.find((n) => n.id === "n11")?.readBy,
  ).toEqual([]);
});
test("seguridad puede editar permisos y no puede editar empleados", () => {
  const store = useDemo.getState();
  store.login("seguridad", "NexAccess2026!", "SEGURIDAD");
  expect(
    store.savePermission({ ...makeDemo().permissions[0], start: "09:00" }),
  ).toBeUndefined();
  expect(useDemo.getState().data.permissions[0].start).toBe("09:00");
  expect(store.saveEmployee(makeDemo().employees[0])).toMatch(/no permite/);
});
test("no permite duplicar el correo de otro empleado", () => {
  const store = useDemo.getState();
  store.login("admin", "NexAccess2026!", "ADMIN");
  const d = makeDemo();
  expect(
    store.saveEmployee({ ...d.employees[0], email: d.employees[1].email }),
  ).toMatch(/ya pertenece/);
});
test("no permite reactivar credenciales revocadas", () => {
  const store = useDemo.getState();
  store.login("admin", "NexAccess2026!", "ADMIN");
  expect(store.toggle("credentials", "c5")).toMatch(/revocada/);
});
