import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { makeDemo } from "../data/mocks";
import {
  AttendanceRecord,
  AuthUser,
  DemoData,
  SystemRole,
  AccessPermission,
  Employee,
} from "../types";
import { can, manualError } from "../utils/domain";
interface Store {
  data: DemoData;
  user?: AuthUser;
  hydrated: boolean;
  storageError?: string;
  compact: boolean;
  login: (username: string, password: string, role: SystemRole) => boolean;
  logout: () => void;
  switchRole: (role: SystemRole) => void;
  markRead: (ids: string[]) => void;
  correct: (
    record: Omit<AttendanceRecord, "id" | "source">,
  ) => string | undefined;
  savePermission: (permission: AccessPermission) => string | undefined;
  saveEmployee: (employee: Employee) => string | undefined;
  toggle: (
    resource:
      | "employees"
      | "areas"
      | "devices"
      | "credentials"
      | "accessRoles"
      | "users",
    id: string,
  ) => string | undefined;
  setCompact: (value: boolean) => void;
  reset: () => void;
}
const audit = (
  data: DemoData,
  user: AuthUser,
  action: string,
  resource: string,
  detail: string,
) => [
  {
    id: `au${Date.now()}`,
    at: new Date().toISOString(),
    actor: user.username,
    action,
    resource,
    detail,
    result: "SIMULADO",
  },
  ...data.audit,
];
export const useDemo = create<Store>()(
  persist(
    (set, get) => ({
      data: makeDemo(),
      compact: false,
      hydrated: false,
      login: (username, password, role) => {
        if (
          username.trim().toLowerCase() !== role.toLowerCase() ||
          password !== "NexAccess2026!"
        )
          return false;
        const user = get().data.users.find((u) => u.role === role && u.active);
        if (!user) return false;
        set({ user });
        return true;
      },
      logout: () => set({ user: undefined }),
      saveEmployee: (employee) => {
        if (employee.id === "new")
          employee = { ...employee, id: `e${Date.now()}` };
        const { user, data } = get();
        if (!user || !can(user.role, "hr"))
          return "Tu perfil no permite editar empleados.";
        if (
          employee.name.trim().length < 3 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)
        )
          return "Completá un nombre y un correo válidos.";
        if (
          data.employees.some(
            (e) =>
              e.id !== employee.id &&
              e.email.toLowerCase() === employee.email.toLowerCase(),
          )
        )
          return "Este correo ya pertenece a otro empleado.";
        const exists = data.employees.some((e) => e.id === employee.id);
        set({
          data: {
            ...data,
            employees: exists
              ? data.employees.map((e) => (e.id === employee.id ? employee : e))
              : [employee, ...data.employees],
            audit: audit(
              data,
              user,
              exists ? "UPDATE" : "CREATE",
              "empleado",
              employee.id,
            ),
          },
        });
        return undefined;
      },
      switchRole: (role) =>
        set({
          user: get().data.users.find((u) => u.role === role && u.active),
        }),
      markRead: (ids) => {
        const { user, data } = get();
        if (!user) return;
        set({
          data: {
            ...data,
            notifications: data.notifications.map((n) =>
              ids.includes(n.id) &&
              (n.employeeId === user.employeeId || n.roles?.includes(user.role))
                ? { ...n, readBy: [...new Set([...n.readBy, user.id])] }
                : n,
            ),
          },
        });
      },
      correct: (record) => {
        const { user, data } = get();
        if (!user || !can(user.role, "hr"))
          return "Tu perfil no permite corregir asistencia.";
        if (!data.employees.some((e) => e.id === record.employeeId && e.active))
          return "Seleccioná un empleado activo.";
        const error = manualError(
          record.employeeId,
          record.at,
          record.note || "",
          data.attendance,
        );
        if (error) return error;
        set({
          data: {
            ...data,
            attendance: [
              { ...record, id: `manual${Date.now()}`, source: "MANUAL" },
              ...data.attendance,
            ],
            audit: audit(data, user, "MANUAL_MARK", "marcacion", record.note!),
          },
        });
        return undefined;
      },
      savePermission: (permission) => {
        const { user, data } = get();
        if (!user || !can(user.role, "security"))
          return "No tenés permiso para esta acción.";
        if (
          !data.accessRoles.some((r) => r.id === permission.accessRoleId) ||
          !data.areas.some((a) => a.id === permission.areaId)
        )
          return "Rol y área obligatorios.";
        if (
          !permission.days.length ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(permission.start) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(permission.end) ||
          permission.start >= permission.end
        )
          return "Seleccioná días y un horario válido (inicio anterior al fin).";
        if (
          data.permissions.some(
            (p) =>
              p.id !== permission.id &&
              p.accessRoleId === permission.accessRoleId &&
              p.areaId === permission.areaId,
          )
        )
          return "Ya existe un permiso para este rol y área.";
        const exists = data.permissions.some((p) => p.id === permission.id);
        set({
          data: {
            ...data,
            permissions: exists
              ? data.permissions.map((p) =>
                  p.id === permission.id ? permission : p,
                )
              : [permission, ...data.permissions],
            audit: audit(
              data,
              user,
              exists ? "UPDATE" : "CREATE",
              "permiso_acceso",
              permission.id,
            ),
          },
        });
        return undefined;
      },
      toggle: (resource, id) => {
        const { user, data } = get();
        if (!user) return "Iniciá sesión.";
        const allowed =
          resource === "users"
            ? can(user.role, "admin")
            : resource === "employees"
              ? can(user.role, "hr")
              : can(user.role, "security");
        if (!allowed) return "Tu perfil no permite esta acción.";
        if (resource === "users" && id === user.id)
          return "No podés desactivar tu propia cuenta de demostración.";
        const item = data[resource].find((x) => x.id === id);
        if (!item) return "No se encontró el registro.";
        if (resource === "credentials" && "revokedAt" in item && item.revokedAt)
          return "Una credencial revocada no puede reactivarse.";
        set({
          data: {
            ...data,
            [resource]: data[resource].map((x) =>
              x.id === id ? { ...x, active: !x.active } : x,
            ),
            audit: audit(data, user, "UPDATE", resource, id),
          },
        });
        return undefined;
      },
      setCompact: (compact) => set({ compact }),
      reset: () => set({ data: makeDemo(), user: undefined, compact: false }),
    }),
    {
      name: "nexaccess-mobile-demo-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ data, compact }) => ({ data, compact }),
      onRehydrateStorage: () => (_state, error) => {
        useDemo.setState({
          hydrated: true,
          storageError: error
            ? "No se pudo leer el almacenamiento local. La demo funciona en memoria."
            : undefined,
        });
      },
    },
  ),
);
