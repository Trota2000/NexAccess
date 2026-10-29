import React, { useCallback, useEffect, useState } from "react";
import * as Clipboard from "expo-clipboard";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  Check,
  ChevronRight,
  CreditCard,
  LockKeyhole,
  Nfc,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Copy,
} from "lucide-react-native";
import { useDesign } from "../api/Theme";
import { usePersonal } from "./SessionProvider";
import {
  nfcModes,
  pageOf,
  personalCredential,
  PersonalCredential,
  profile,
  Profile,
} from "./types";
import {
  Action,
  dateLabel,
  Loading,
  message,
  Notice,
  Sheet,
  styles,
} from "./ui";

export default function PersonalCard() {
  const { client, user, notice, nfcMode, setNfcMode, capabilities } =
    usePersonal();
  const { color, styles: s } = useDesign(styles);
  const employeeId = user?.employeeId;
  const [person, setPerson] = useState<Profile>();
  const [cards, setCards] = useState<PersonalCredential[]>([]);
  const [selectedId, selectId] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [choosingCard, setChoosingCard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [installation, setInstallation] = useState("");
  const [installationError, setInstallationError] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    void client
      .getInstallationId()
      .then((value) => {
        if (active) setInstallation(value);
      })
      .catch(() => {
        if (active)
          setInstallationError(
            "No se pudo leer la instalación. Volvé a abrir la app para intentarlo nuevamente.",
          );
      });
    return () => {
      active = false;
    };
  }, [client]);
  const load = useCallback(
    async (isActive: () => boolean) => {
      setBusy(true);
      setError("");
      try {
        const [p, list] = await Promise.all([
          client.get("/me", profile),
          client.get(
            "/me/credentials?page=1&pageSize=200",
            pageOf(personalCredential),
          ),
        ]);
        if (
          p.employeeId !== employeeId ||
          p.userId !== user?.id ||
          p.username !== user.username
        )
          throw new Error(
            "El servidor devolvió una ficha que no corresponde a tu cuenta.",
          );
        if (!isActive()) return;
        setPerson(p);
        setCards(list.items.filter((c) => c.type === "DIGITAL"));
        selectId((current) =>
          list.items.some((c) => c.id === current && c.type === "DIGITAL")
            ? current
            : (
                list.items.find(
                  (c) => c.type === "DIGITAL" && c.status === "ACTIVA",
                ) ?? list.items.find((c) => c.type === "DIGITAL")
              )?.id,
        );
      } catch (e) {
        if (isActive()) {
          setError(message(e));
          setPerson(undefined);
          setCards([]);
        }
      } finally {
        if (isActive()) setBusy(false);
      }
    },
    [client, employeeId, user],
  );
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void load(() => active);
    });
    return () => {
      active = false;
    };
  }, [load]);
  const card = cards.find((c) => c.id === selectedId);
  const chosen = nfcModes.find((mode) => mode.key === nfcMode)!;
  const labels = {
    ACTIVA: "Activa",
    INACTIVA: "Inactiva",
    REVOCADA: "Revocada",
    VENCIDA: "Vencida",
  };
  return (
    <>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={busy}
            onRefresh={() => void load(() => true)}
            tintColor={color.primary}
            colors={[color.primary]}
          />
        }
      >
        <View style={{ gap: 4 }}>
          <Text style={s.eyebrow}>ACCESO PERSONAL</Text>
          <Text accessibilityRole="header" style={s.heading}>
            Mi tarjeta
          </Text>
        </View>
        {!!notice && <Notice>{notice}</Notice>}
        {!!error && (
          <>
            <Notice error>{error}</Notice>
            <Action
              title="Volver a intentar"
              icon={RefreshCw}
              secondary
              onPress={() => void load(() => true)}
              disabled={busy}
            />
          </>
        )}
        {busy && !person ? (
          <Loading label="Consultando tu tarjeta…" />
        ) : (
          person && (
            <>
              <View
                style={[
                  s.card,
                  { borderTopWidth: 4, borderTopColor: color.primary, gap: 24 },
                ]}
              >
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <View style={[s.row, { flexShrink: 1 }]}>
                    <CreditCard size={20} color={color.primary} />
                    <Text style={s.eyebrow}>NEXACCESS</Text>
                  </View>
                  {card && (
                    <View
                      style={{
                        backgroundColor:
                          card.status === "ACTIVA"
                            ? color.successBg
                            : color.warningBg,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            card.status === "ACTIVA"
                              ? color.success
                              : color.warning,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {labels[card.status]}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={s.muted}>TITULAR</Text>
                  <Text style={[s.heading, { fontSize: 25, lineHeight: 32 }]}>
                    {person.fullName}
                  </Text>
                  <Text style={s.muted}>Empleado · #{person.employeeId}</Text>
                </View>
                <View style={s.divider} />
                {card ? (
                  <>
                    <View
                      style={[
                        s.row,
                        {
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        },
                      ]}
                    >
                      <View style={{ gap: 4, flex: 1 }}>
                        <Text style={s.muted}>
                          {card.name || "Credencial digital"}
                        </Text>
                        <Text
                          style={[
                            s.body,
                            { fontWeight: "600", letterSpacing: 2 },
                          ]}
                        >
                          {card.maskedCode}
                        </Text>
                      </View>
                      <Nfc size={32} color={color.primary} />
                    </View>
                    <Text style={s.muted}>
                      Vigencia · {dateLabel(card.expiresAt)}
                    </Text>
                  </>
                ) : (
                  <View style={{ gap: 8 }}>
                    <Text style={s.sectionTitle}>
                      Todavía no tenés una tarjeta digital
                    </Text>
                    <Text style={s.muted}>
                      Solicitá al administrador que asigne una credencial móvil
                      a tu cuenta.
                    </Text>
                  </View>
                )}
              </View>
              {cards.length > 1 && (
                <Action
                  title="Seleccionar mi tarjeta"
                  icon={CreditCard}
                  secondary
                  onPress={() => setChoosingCard(true)}
                />
              )}
              <View
                style={[
                  s.row,
                  {
                    alignItems: "flex-start",
                    backgroundColor: color.warningBg,
                    borderRadius: 12,
                    padding: 16,
                  },
                ]}
              >
                <ShieldCheck size={20} color={color.warning} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={[s.label, { color: color.warning, marginBottom: 0 }]}
                  >
                    Integración NFC pendiente
                  </Text>
                  <Text style={[s.muted, { color: color.warning }]}>
                    {capabilities.reason ||
                      "Falta vincular la credencial con el servicio NFC nativo y verificar el lector."}
                  </Text>
                </View>
              </View>
            </>
          )
        )}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Vincular este teléfono</Text>
          <Text style={s.muted}>
            Copiá este identificador y entregalo al administrador para que emita
            tu tarjeta. Mantené la sesión iniciada durante la vinculación.
          </Text>
          {!!installation && (
            <Text
              selectable
              accessibilityLabel="Identificador de instalación"
              style={s.body}
            >
              {installation}
            </Text>
          )}
          {!!installationError && <Notice error>{installationError}</Notice>}
          <Action
            title={copied ? "Identificador copiado" : "Copiar identificador"}
            icon={Copy}
            secondary
            disabled={!installation}
            onPress={() => {
              void Clipboard.setStringAsync(installation)
                .then(() => {
                  setCopied(true);
                  setInstallationError("");
                })
                .catch(() =>
                  setInstallationError(
                    "No se pudo copiar. Mantené pulsado el identificador para copiarlo manualmente.",
                  ),
                );
            }}
          />
        </View>
        <View style={s.card}>
          <View style={s.row}>
            <Smartphone size={20} color={color.primary} />
            <Text style={s.sectionTitle}>Uso de la tarjeta</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Modo NFC: ${chosen.title}`}
            onPress={() => setOpen(true)}
            style={[s.row, { minHeight: 48, justifyContent: "space-between" }]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[s.body, { fontWeight: "600" }]}>
                {chosen.title}
              </Text>
              <Text style={s.muted}>{chosen.description}</Text>
            </View>
            <ChevronRight size={20} color={color.primary} />
          </Pressable>
          <Text style={s.muted}>
            La preferencia se guarda en este teléfono. Su disponibilidad depende
            de Android y de la integración NFC.
          </Text>
        </View>
      </ScrollView>
      {open && (
        <Sheet
          title="Cuándo usar mi tarjeta"
          onClose={() => {
            if (!saving) setOpen(false);
          }}
        >
          {nfcModes.map((option) => {
            const disabled =
              saving ||
              (option.key === "always" &&
                capabilities.available &&
                !capabilities.alwaysAvailable);
            const Icon =
              option.key === "foreground"
                ? Smartphone
                : option.key === "unlocked"
                  ? LockKeyhole
                  : Nfc;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="radio"
                accessibilityLabel={option.title}
                accessibilityState={{
                  checked: nfcMode === option.key,
                  disabled,
                }}
                disabled={disabled}
                onPress={() => {
                  setSaving(true);
                  void setNfcMode(option.key)
                    .then(() => setOpen(false))
                    .catch((e) => setError(message(e)))
                    .finally(() => setSaving(false));
                }}
                style={[
                  s.row,
                  {
                    alignItems: "flex-start",
                    borderWidth: 1,
                    borderColor:
                      nfcMode === option.key ? color.primary : color.border,
                    borderRadius: 12,
                    padding: 16,
                    backgroundColor:
                      nfcMode === option.key ? color.soft : color.card,
                    opacity: disabled ? 0.5 : 1,
                  },
                ]}
              >
                <Icon size={20} color={color.primary} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[s.body, { fontWeight: "600" }]}>
                    {option.title}
                  </Text>
                  <Text style={s.muted}>{option.description}</Text>
                </View>
                {option.key === nfcMode && (
                  <Check size={20} color={color.primary} />
                )}
              </Pressable>
            );
          })}
          <Text style={s.muted}>
            “En todo momento” depende del teléfono y no funciona con NFC
            desactivado o restricciones del sistema.
          </Text>
        </Sheet>
      )}
      {choosingCard && (
        <Sheet
          title="Mis tarjetas digitales"
          onClose={() => setChoosingCard(false)}
        >
          {cards.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="radio"
              accessibilityLabel={`${c.name || "Tarjeta digital"} ${c.maskedCode}`}
              accessibilityState={{ checked: c.id === selectedId }}
              style={[s.card, s.row, { padding: 16 }]}
              onPress={() => {
                selectId(c.id);
                setChoosingCard(false);
              }}
            >
              <CreditCard size={20} color={color.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.body}>{c.name || "Tarjeta digital"}</Text>
                <Text style={s.muted}>
                  {c.maskedCode} · {labels[c.status]}
                </Text>
              </View>
              {c.id === selectedId && <Check size={20} color={color.primary} />}
            </Pressable>
          ))}
        </Sheet>
      )}
    </>
  );
}
