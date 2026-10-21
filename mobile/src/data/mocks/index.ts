import { format, subDays } from "date-fns";
import { DemoData, SystemRole } from "../../types";
export const roleNames: Record<SystemRole, string> = {
  EMPLEADO: "Empleado",
  SEGURIDAD: "Seguridad",
  RRHH: "Recursos Humanos",
  ADMIN: "Administrador",
};
export const today = () => format(new Date(), "yyyy-MM-dd");
export function makeDemo(): DemoData {
  const stamp = (days: number, time: string) =>
    `${format(subDays(new Date(), days), "yyyy-MM-dd")}T${time}:00-03:00`;
  const employees = [
    {
      id: "e1",
      name: "Sofía Benítez",
      document: "••••4821",
      email: "sofia@example.test",
      phone: "0981 000 001",
      department: "Operaciones",
      active: true,
      accessRoleIds: ["r1"],
    },
    {
      id: "e2",
      name: "Diego Acosta",
      document: "••••7310",
      email: "diego@example.test",
      department: "Seguridad",
      active: true,
      accessRoleIds: ["r2"],
    },
    {
      id: "e3",
      name: "Ana López",
      document: "••••2508",
      email: "ana@example.test",
      department: "Personas",
      active: true,
      accessRoleIds: ["r3"],
    },
    {
      id: "e4",
      name: "Julio Bernal",
      document: "••••9124",
      email: "julio@example.test",
      department: "Tecnología",
      active: true,
      accessRoleIds: ["r4"],
    },
    {
      id: "e5",
      name: "Mateo Vera",
      document: "••••1140",
      email: "mateo@example.test",
      department: "Operaciones",
      active: false,
      accessRoleIds: ["r1"],
    },
  ];
  return {
    employees,
    users: (["EMPLEADO", "SEGURIDAD", "RRHH", "ADMIN"] as SystemRole[]).map(
      (role, i) => ({
        id: `u${i + 1}`,
        username: role.toLowerCase(),
        employeeId: `e${i + 1}`,
        role,
        active: true,
      }),
    ),
    accessRoles: ["EMPLEADO", "SEGURIDAD", "RRHH", "ADMINISTRADOR"].map(
      (code, i) => ({ id: `r${i + 1}`, code, name: code, active: true }),
    ),
    areas: [
      {
        id: "a1",
        code: "RECEPCION",
        name: "Recepción",
        restricted: false,
        active: true,
        description: "Entrada principal del edificio.",
      },
      {
        id: "a2",
        code: "DATACENTER",
        name: "Centro de datos",
        restricted: true,
        active: true,
        description: "Acceso autorizado a personal técnico.",
      },
      {
        id: "a3",
        code: "RRHH",
        name: "Recursos Humanos",
        restricted: true,
        active: true,
        description: "Oficinas del equipo de Personas.",
      },
      {
        id: "a4",
        code: "DEPOSITO",
        name: "Depósito",
        restricted: true,
        active: false,
        description: "Temporalmente fuera de servicio.",
      },
    ],
    devices: [
      {id:'d4',code:'RRHH-01',name:'Puerta de Recursos Humanos',areaId:'a3',type:'ACCESO',active:true,lastSeen:new Date().toISOString()},
      {
        id: "d1",
        code: "ACCESO-01",
        name: "Lector de recepción",
        areaId: "a1",
        type: "MIXTO",
        active: true,
        lastSeen: new Date().toISOString(),
      },
      {
        id: "d2",
        code: "DC-01",
        name: "Puerta del centro de datos",
        areaId: "a2",
        type: "ACCESO",
        active: false,
        lastSeen: stamp(1, "17:00"),
      },
      {
        id: "d3",
        code: "RELOJ-01",
        name: "Marcador principal",
        areaId: "a1",
        type: "MARCACION",
        active: true,
        lastSeen: new Date().toISOString(),
      },
    ],
    credentials: employees.flatMap((e, i) => [
      {
        id: `c${i + 1}`,
        employeeId: e.id,
        name: "Credencial digital",
        type: "DIGITAL" as const,
        maskedCode: `••••${4821 + i}`,
        active: i !== 4,
        expiresAt: `${format(subDays(new Date(), -90), "yyyy-MM-dd")}T23:59:00-03:00`,
        ...(i === 4 ? { revokedAt: stamp(10, "12:00") } : {}),
      },
      {
        id: `f${i + 1}`,
        employeeId: e.id,
        name: "Tarjeta física",
        type: "FISICA" as const,
        maskedCode: `••••${8123 + i}`,
        active: i !== 2,
        ...(i === 1 ? { expiresAt: stamp(1, "12:00") } : i === 0 ? {expiresAt:stamp(-5,'12:00')} : {}),
      },
    ]),
    permissions: employees
      .slice(0, 4)
      .map((_, i) => ({
        id: `p${i + 1}`,
        accessRoleId: `r${i + 1}`,
        areaId: "a3",
        days: [1, 2, 3, 4, 5],
        start: "07:00",
        end: "19:00",
        active: true,
      })),
    events: employees.flatMap((e, i) =>
      Array.from({ length: 6 }, (_, n) => ({
        id: `ev${i}-${n}`,
        employeeId: e.id,
        credentialId: `c${i + 1}`,
        areaId: n === 2 ? "a2" : n === 4 ? "a3" : "a1",
        deviceId: n === 2 ? "d2" : n === 4 ? "d4" : "d1",
        at: stamp(n + 1, n === 4 ? "22:10" : n % 2 ? "17:05" : "08:02"),
        type: "ACCESO",
        result:
          i === 4 || n === 2 || n === 4 ? ("RECHAZADO" as const) : ("AUTORIZADO" as const),
        reason:
          i === 4 ? 'CREDENTIAL_REVOKED' : n === 2
            ? "NO_PERMISSION"
            : n === 4
              ? "OUTSIDE_SCHEDULE"
              : "AUTHORIZED",
      })),
    ),
    attendance: employees
      .slice(0, 4)
      .flatMap((e, i) =>
        Array.from({ length: 10 }, (_, n) => ({
          id: `m${i}-${n}`,
          employeeId: e.id,
          at: stamp(Math.floor(n / 2) + 1, n % 2 ? "17:00" : "08:00"),
          type: n % 2 ? ("SALIDA" as const) : ("ENTRADA" as const),
          deviceId: "d3",
          source: "DISPOSITIVO" as const,
        })),
      ),
    notifications: [
      {id:'n13',employeeId:'e1',title:'Cambios en tus permisos',description:'Tu rol físico tiene acceso a Recursos Humanos de lunes a viernes, de 07:00 a 19:00. Dato ficticio.',at:stamp(1,'10:00'),type:'PERMISO',readBy:[]},
      {id:'n14',employeeId:'e1',title:'Tarjeta próxima a vencer',description:'Tu tarjeta física vence en cinco días desde la creación de esta demo. Consultá sus detalles.',at:stamp(0,'07:30'),type:'CREDENCIAL',readBy:[]},
      {id:'n15',employeeId:'e3',title:'Tarjeta física desactivada',description:'Tu tarjeta física está inactiva. Tu credencial digital de demostración continúa activa.',at:stamp(1,'10:15'),type:'CREDENCIAL',readBy:[]},
      {id:'n16',roles:['SEGURIDAD','ADMIN'],title:'Credencial revocada',description:'La credencial digital de Mateo Vera fue revocada. Consultá Credenciales para ver su estado.',at:stamp(10,'12:00'),type:'CREDENCIAL',readBy:[]},
      ...employees.map((e, i) => ({
        id: `n${i}`,
        employeeId: e.id,
        title: "Tu credencial está disponible",
        description:
          "Consultá el estado de tu credencial desde la aplicación. Esta representación es demostrativa.",
        at: stamp(0, "07:00"),
        type: "CREDENCIAL" as const,
        readBy: [],
      })),
      {
        id: "n10",
        employeeId: "e1",
        title: "Acceso rechazado",
        description:
          "El centro de datos requiere un permiso de acceso que no tenés asignado.",
        at: stamp(3, "08:02"),
        type: "ACCESO",
        readBy: [],
      },
      {
        id: "n11",
        roles: ["SEGURIDAD", "ADMIN"],
        title: "Lector sin conexión",
        description:
          "DC-01 no reporta conexión desde ayer. Verificá el equipo en sitio.",
        at: stamp(0, "07:10"),
        type: "DISPOSITIVO",
        readBy: [],
      },
      {
        id: "n12",
        roles: ["RRHH", "ADMIN"],
        title: "Revisá las marcaciones",
        description:
          "Podés consultar los registros y simular una corrección manual justificada.",
        at: stamp(0, "07:20"),
        type: "AVISO",
        readBy: [],
      },
    ],
    audit: [
      {
        id: "au1",
        at: stamp(1, "09:10"),
        actor: "admin",
        action: "UPDATE",
        resource: "permiso_acceso",
        result: "CORRECTO",
        detail: "Ajuste de horario del permiso de recepción. Dato ficticio.",
      },
    ],
  };
}
