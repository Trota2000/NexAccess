import { z } from "zod";

const identifier = z.number().int().positive().safe();
export const employeeUser = z.object({
  id: identifier,
  username: z.string().min(1),
  role: z.literal("EMPLEADO"),
  employeeId: identifier,
  isActive: z.literal(true),
});
export const mobileSession = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal("Bearer"),
  expiresAt: z.iso.datetime({ offset: true }),
  refreshToken: z.string().min(1),
  sessionId: z.string().min(1),
  user: employeeUser,
});
export const storedSession = mobileSession
  .pick({ refreshToken: true, sessionId: true, user: true })
  .extend({ api: z.string() });
export type EmployeeUser = z.infer<typeof employeeUser>;
export type StoredSession = z.infer<typeof storedSession>;
export const profile = z.object({
  userId: identifier,
  username: z.string().min(1),
  role: z.literal("EMPLEADO"),
  employeeId: identifier,
  fullName: z.string(),
  isActive: z.literal(true),
});
export type Profile = z.infer<typeof profile>;
export const personalCredential = z.object({
  id: identifier,
  name: z.string().nullable(),
  type: z.enum(["DIGITAL", "FISICA"]),
  maskedCode: z.string(),
  status: z.enum(["ACTIVA", "INACTIVA", "VENCIDA", "REVOCADA"]),
  issuedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }).nullable(),
});
export type PersonalCredential = z.infer<typeof personalCredential>;
// Current C# DTO uses `credential`; the supplied manual says `credentialCode`.
// Keep this secret separate from card/history models. HCE provisioning is not implemented.
export const nfcCredentialPayload = z.object({
  credentialId: identifier,
  credential: z.string().min(1),
  expiresAt: z.iso.datetime({ offset: true }).nullable(),
});
export const accessEvent = z.object({
  id: identifier,
  occurredAt: z.iso.datetime({ offset: true }),
  result: z.enum(["AUTORIZADO", "RECHAZADO"]),
  reason: z.string().nullable(),
  employeeId: identifier.nullable(),
  areaName: z.string().nullable(),
  deviceCode: z.string().nullable(),
});
export type AccessEvent = z.infer<typeof accessEvent>;
export const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive().max(200),
    totalItems: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  });
export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
export type NfcMode = "foreground" | "unlocked" | "always";
export const nfcModes: { key: NfcMode; title: string; description: string }[] =
  [
    {
      key: "foreground",
      title: "Solo con la app abierta",
      description: "NexAccess visible y teléfono desbloqueado.",
    },
    {
      key: "unlocked",
      title: "Con pantalla desbloqueada",
      description: "También cuando la app no esté abierta.",
    },
    {
      key: "always",
      title: "En todo momento",
      description: "Incluye pantalla bloqueada, si Android lo permite.",
    },
  ];
