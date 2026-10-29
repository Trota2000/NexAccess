import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import { useDesign } from "../api/Theme";
import CalendarField from "../api/CalendarField";
import { usePersonal } from "./SessionProvider";
import { accessEvent, AccessEvent, pageOf, Page } from "./types";
import {
  Action,
  dateLabel,
  Loading,
  message,
  Notice,
  Sheet,
  styles,
} from "./ui";

type Filters = { from: string; to: string; result: string };
const emptyFilters: Filters = { from: "", to: "", result: "" };
const reasons: Record<string, string> = {
  AUTHORIZED: "Permiso validado",
  NO_PERMISSION: "Sin permiso para esta área",
  OUTSIDE_SCHEDULE: "Fuera del horario permitido",
  CREDENTIAL_INACTIVE: "Credencial inactiva",
  CREDENTIAL_REVOKED: "Credencial revocada",
  CREDENTIAL_EXPIRED: "Credencial vencida",
  EMPLOYEE_INACTIVE: "Empleado inactivo",
};
export default function PersonalHistory() {
  const { client, user, notice } = usePersonal();
  const { color, styles: s } = useDesign(styles);
  const [page, setPage] = useState(1);
  const [revision, refresh] = useState(0);
  const [filters, setFilters] = useState(emptyFilters);
  const [draft, setDraft] = useState(emptyFilters);
  const [open, setOpen] = useState(false);
  const [filterError, setFilterError] = useState("");
  const [result, setResult] = useState<Page<AccessEvent>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(
    async (active: () => boolean) => {
      setBusy(true);
      setError("");
      setResult(undefined);
      const query = new URLSearchParams({ page: String(page), pageSize: "20" });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });
      try {
        const next = await client.get(
          `/me/access-events?${query}`,
          pageOf(accessEvent),
        );
        if (next.items.some((item) => item.employeeId !== user?.employeeId))
          throw new Error("El historial recibido no corresponde a tu cuenta.");
        if (active()) setResult(next);
      } catch (e) {
        if (active()) setError(message(e));
      } finally {
        if (active()) setBusy(false);
      }
    },
    [client, user?.employeeId, page, filters],
  );
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void load(() => active);
    });
    return () => {
      active = false;
    };
  }, [load, revision]);
  const filtered = !!(filters.from || filters.to || filters.result);
  return (
    <>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={busy}
            onRefresh={() => refresh((r) => r + 1)}
            tintColor={color.primary}
            colors={[color.primary]}
          />
        }
      >
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <View style={{ gap: 4, flex: 1 }}>
            <Text style={s.eyebrow}>MIS ACCESOS</Text>
            <Text accessibilityRole="header" style={s.heading}>
              Historial
            </Text>
          </View>
          <Action
            title="Filtros"
            icon={SlidersHorizontal}
            secondary
            onPress={() => {
              setDraft(filters);
              setFilterError("");
              setOpen(true);
            }}
          />
        </View>
        {!!notice && <Notice>{notice}</Notice>}
        {filtered && (
          <View style={s.card}>
            <Text style={s.muted}>
              {filters.from ? dateLabel(filters.from) : "Desde el inicio"} ·{" "}
              {filters.to ? dateLabel(filters.to) : "Hasta hoy"}
              {filters.result
                ? ` · ${filters.result === "AUTORIZADO" ? "Autorizados" : "Rechazados"}`
                : ""}
            </Text>
            <Action
              title="Limpiar filtros"
              icon={X}
              secondary
              onPress={() => {
                setFilters(emptyFilters);
                setPage(1);
              }}
            />
          </View>
        )}
        {!!error && (
          <>
            <Notice error>{error}</Notice>
            <Action
              title="Volver a intentar"
              icon={RefreshCw}
              secondary
              onPress={() => refresh((r) => r + 1)}
              disabled={busy}
            />
          </>
        )}
        {busy && <Loading label="Consultando tus accesos…" />}
        {!busy && result?.items.length === 0 && (
          <View style={s.empty}>
            <History size={30} color={color.primary} />
            <Text style={s.sectionTitle}>
              {filtered
                ? "Sin accesos en este período"
                : "Todavía no tenés accesos registrados"}
            </Text>
            <Text style={[s.muted, { textAlign: "center" }]}>
              Los intentos registrados por el lector aparecerán aquí.
            </Text>
          </View>
        )}
        {result?.items.map((item) => {
          const allowed = item.result === "AUTORIZADO";
          return (
            <View key={item.id} style={[s.card, { padding: 16, gap: 12 }]}>
              <View
                style={[
                  s.row,
                  { justifyContent: "space-between", alignItems: "flex-start" },
                ]}
              >
                <View style={[s.row, { flexShrink: 1 }]}>
                  <View
                    style={{
                      backgroundColor: allowed
                        ? color.successBg
                        : color.errorBg,
                      padding: 10,
                      borderRadius: 12,
                    }}
                  >
                    {allowed ? (
                      <Check size={20} color={color.success} />
                    ) : (
                      <X size={20} color={color.error} />
                    )}
                  </View>
                  <View style={{ flexShrink: 1, gap: 4 }}>
                    <Text style={[s.body, { fontWeight: "600" }]}>
                      {item.areaName || "Área sin especificar"}
                    </Text>
                    <Text style={s.muted}>{item.deviceCode || "Lector"}</Text>
                  </View>
                </View>
                <Text
                  style={{
                    color: allowed ? color.success : color.error,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {allowed ? "Autorizado" : "Rechazado"}
                </Text>
              </View>
              <View style={s.divider} />
              <View style={[s.wrap, { justifyContent: "space-between" }]}>
                <Text style={s.muted}>{dateLabel(item.occurredAt)}</Text>
                <Text style={[s.body, { fontWeight: "600" }]}>
                  {new Date(item.occurredAt).toLocaleTimeString("es-PY", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Asuncion",
                  })}
                </Text>
              </View>
              {!!item.reason && (
                <Text style={s.muted}>
                  {reasons[item.reason] || item.reason}
                </Text>
              )}
            </View>
          );
        })}
        {!!result?.totalPages && (
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Action
              title="Anterior"
              icon={ChevronLeft}
              secondary
              disabled={busy || page <= 1}
              onPress={() => setPage((p) => p - 1)}
            />
            <Text style={s.muted}>
              {page} / {result.totalPages}
            </Text>
            <Action
              title="Siguiente"
              icon={ChevronRight}
              secondary
              disabled={busy || page >= result.totalPages}
              onPress={() => setPage((p) => p + 1)}
            />
          </View>
        )}
      </ScrollView>
      {open && (
        <Sheet title="Filtrar mis accesos" onClose={() => setOpen(false)}>
          <View>
            <Text style={s.label}>Desde</Text>
            <CalendarField
              label="Desde"
              value={draft.from}
              edge="from"
              onChange={(value) => setDraft((d) => ({ ...d, from: value }))}
            />
          </View>
          <View>
            <Text style={s.label}>Hasta</Text>
            <CalendarField
              label="Hasta"
              value={draft.to}
              edge="to"
              onChange={(value) => setDraft((d) => ({ ...d, to: value }))}
            />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={s.label}>Resultado</Text>
            <View style={s.wrap}>
              {[
                ["", "Todos"],
                ["AUTORIZADO", "Autorizados"],
                ["RECHAZADO", "Rechazados"],
              ].map(([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: draft.result === value }}
                  onPress={() => setDraft((d) => ({ ...d, result: value }))}
                  style={{
                    minHeight: 44,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor:
                      draft.result === value ? color.primary : color.soft,
                  }}
                >
                  <Text
                    style={{
                      color:
                        draft.result === value
                          ? color.onPrimary
                          : color.primary,
                      fontWeight: "600",
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {!!filterError && <Notice error>{filterError}</Notice>}
          <Action
            title="Aplicar filtros"
            icon={Check}
            onPress={() => {
              if (
                draft.from &&
                draft.to &&
                Date.parse(draft.from) > Date.parse(draft.to)
              ) {
                setFilterError("La fecha Desde debe ser anterior a Hasta.");
                return;
              }
              setFilters(draft);
              setPage(1);
              setOpen(false);
            }}
          />
        </Sheet>
      )}
    </>
  );
}
