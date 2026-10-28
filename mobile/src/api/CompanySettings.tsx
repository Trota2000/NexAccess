import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File as LocalFile } from "expo-file-system";
import {
  Building2,
  Check,
  RefreshCw,
  Upload,
  Trash2,
  X,
  LucideIcon,
} from "lucide-react-native";
import { ApiClient, ApiError, Session } from "./client";
import { Colors, spacing, useDesign, useReducedMotion } from "./Theme";
import {
  Company,
  CompanyDraft,
  companyBody,
  companyDraft,
  companyFields,
  getCompany,
  getCompanyLogo,
  MAX_LOGO_SIZE,
  readCompany,
  validateLogo,
} from "./company";

export default function CompanySettings({
  client,
  session,
}: {
  client: ApiClient;
  session: Session;
}) {
  const { color, styles: s } = useDesign(styles);
  const reduced = useReducedMotion();
  const admin = session.user.role === "ADMIN";
  const [company, setCompany] = useState<Company | null>();
  const [draft, setDraft] = useState<CompanyDraft>(() => companyDraft());
  const [logo, setLogo] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lock = useRef(false);
  const alive = useRef(true);
  function message(e: unknown) {
    const fields =
      e instanceof ApiError ? Object.values(e.errors).flat().join(" ") : "";
    return (
      fields ||
      (e instanceof Error || (e && typeof e === "object" && "message" in e)
        ? String(e.message)
        : "No se pudo completar la operación.")
    );
  }
  async function run(action: () => Promise<void>, writing = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      if (alive.current) {
        const unknown =
          writing &&
          (!(e instanceof ApiError) || e.status === 0 || e.status >= 500);
        if (unknown) setUncertain(true);
        setError(
          message(e) +
            (unknown
              ? " No se pudo confirmar el resultado. Actualizá los datos antes de repetir la operación."
              : ""),
        );
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function refresh() {
    await run(async () => {
      const result = await getCompany(client);
      if (!alive.current) return;
      setCompany(result);
      setDraft(companyDraft(result));
      setLogo(undefined);
      const image = result?.tieneLogo
        ? await getCompanyLogo(client)
        : undefined;
      if (alive.current) {
        setLogo(image);
        setUncertain(false);
      }
    });
  }
  async function save() {
    let body;
    try {
      body = companyBody(draft);
    } catch (e) {
      setError(message(e));
      return;
    }
    await run(async () => {
      const result = readCompany(
        await client.request("/empresa", { method: "PUT", body }),
      );
      if (alive.current) {
        setCompany(result);
        setDraft(companyDraft(result));
        setNotice("Datos de la empresa guardados.");
      }
    }, true);
  }
  async function upload() {
    if (!admin || !company || lock.current || uncertain) return;
    await run(async () => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["image/png", "image/jpeg"],
        multiple: false,
        copyToCacheDirectory: true,
        base64: false,
      });
      if (picked.canceled || !alive.current) return;
      const asset = picked.assets[0];
      if (!asset) return;
      // The picker creates a temporary object URL on web. Upload the File itself.
      if (Platform.OS === "web" && asset.uri.startsWith("blob:"))
        URL.revokeObjectURL(asset.uri);
      const mime =
        asset.mimeType ??
        (/\.png$/i.test(asset.name)
          ? "image/png"
          : /\.jpe?g$/i.test(asset.name)
            ? "image/jpeg"
            : "");
      if ((asset.size ?? 0) > MAX_LOGO_SIZE)
        throw new ApiError(
          "Seleccioná una imagen de hasta 2 MB.",
          400,
          "LOGO_TOO_LARGE",
        );
      let bytes: Uint8Array;
      if (Platform.OS === "web") {
        if (!asset.file)
          throw new ApiError(
            "No se pudo leer el archivo seleccionado.",
            400,
            "INVALID_LOGO",
          );
        bytes = new Uint8Array(await asset.file.arrayBuffer());
      } else {
        const file = new LocalFile(asset.uri);
        if (file.size > MAX_LOGO_SIZE)
          throw new ApiError(
            "Seleccioná una imagen de hasta 2 MB.",
            400,
            "LOGO_TOO_LARGE",
          );
        bytes = await file.bytes();
      }
      validateLogo(bytes, mime);
      if (!alive.current) return;
      const form = new FormData();
      form.append(
        "logo",
        Platform.OS === "web"
          ? asset.file!
          : ({
              uri: asset.uri,
              name: asset.name,
              type: mime,
            } as unknown as Blob),
      );
      const result = readCompany(
        await client.request("/empresa/logo", {
          method: "POST",
          formData: form,
        }),
      );
      if (!alive.current) return;
      setCompany(result);
      setLogo(undefined);
      const image = await getCompanyLogo(client);
      if (alive.current) {
        setLogo(image);
        setNotice("Logotipo actualizado.");
      }
    }, true);
  }
  async function remove() {
    setConfirmDelete(false);
    await run(async () => {
      await client.request("/empresa/logo", { method: "DELETE" });
      if (!alive.current) return;
      setLogo(undefined);
      const result = await getCompany(client);
      if (!result || result.tieneLogo)
        throw new ApiError(
          "No se pudo verificar la eliminación del logotipo.",
          0,
          "CONTRACT_ERROR",
        );
      if (alive.current) {
        setCompany(result);
        setNotice(
          "Logotipo eliminado. Los datos empresariales se conservaron.",
        );
      }
    }, true);
  }
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
    };
    // A new authenticated client remounts this screen; no organization data is persisted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);
  const disabled = busy || uncertain;
  return (
    <View style={s.card}>
      <View style={s.toolbar}>
        <View style={s.titleRow}>
          <Building2 size={20} color={color.primary} />
          <Text accessibilityRole="header" style={s.heading}>
            Datos de la empresa
          </Text>
        </View>
        {
          <CompanyAction
            title={"Actualizar datos empresariales"}
            icon={RefreshCw}
            onPress={() => void refresh()}
            disabled={busy}
          />
        }
      </View>
      {busy && (
        <ActivityIndicator
          accessibilityLabel="Procesando datos de la empresa"
          color={color.primary}
        />
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={s.notice}>
          {notice}
        </Text>
      )}
      {company === null && (
        <Text style={s.muted}>
          {admin
            ? "Configurá los datos de la empresa para incluirlos en los reportes PDF. Guardá los datos antes de subir el logo."
            : "La empresa todavía no fue configurada por el administrador."}
        </Text>
      )}
      {company !== undefined && (admin || company) && (
        <>
          <View style={s.fields}>
            {companyFields.map((f) => (
              <View
                key={f.key}
                style={[s.field, f.key === "direccion" && s.wide]}
              >
                <Text style={s.label}>
                  {f.label}
                  {f.key === "razonSocial" && admin ? " *" : ""}
                </Text>
                {admin ? (
                  <TextInput
                    accessibilityLabel={f.label}
                    value={draft[f.key]}
                    editable={!disabled}
                    maxLength={f.max}
                    keyboardType={
                      f.key === "email"
                        ? "email-address"
                        : f.key === "telefono"
                          ? "phone-pad"
                          : "default"
                    }
                    autoCapitalize={f.key === "email" ? "none" : "sentences"}
                    style={s.input}
                    placeholderTextColor={color.muted}
                    onChangeText={(value) =>
                      setDraft((d) => ({ ...d, [f.key]: value }))
                    }
                  />
                ) : (
                  <Text style={s.value}>{company?.[f.key] || "—"}</Text>
                )}
              </View>
            ))}
          </View>
          {company && (
            <Text style={s.muted}>
              Estado empresarial: {company.activo ? "Activo" : "Inactivo"}
            </Text>
          )}
          <View style={s.logoPanel}>
            <Text style={s.label}>Logotipo institucional</Text>
            {logo ? (
              <Image
                accessibilityLabel="Logotipo de la empresa"
                source={{ uri: logo }}
                resizeMode="contain"
                style={s.logo}
                onError={() => {
                  setLogo(undefined);
                  setError(
                    "No se pudo mostrar el logotipo. Actualizá los datos para volver a cargarlo.",
                  );
                }}
              />
            ) : (
              <Text style={s.muted}>
                {company?.tieneLogo
                  ? "El logotipo todavía no está disponible en la vista previa."
                  : "Sin logotipo configurado."}
              </Text>
            )}
            {admin && (
              <View style={s.actions}>
                {
                  <CompanyAction
                    title={
                      company?.tieneLogo
                        ? "Reemplazar logotipo"
                        : "Subir logotipo"
                    }
                    icon={Upload}
                    onPress={() => void upload()}
                    disabled={disabled || !company}
                  />
                }
                {company?.tieneLogo && (
                  <CompanyAction
                    title={"Eliminar logotipo"}
                    icon={Trash2}
                    onPress={() => setConfirmDelete(true)}
                    disabled={disabled}
                    danger={true}
                  />
                )}
              </View>
            )}
            {admin && <Text style={s.muted}>PNG o JPEG · Máximo 2 MB</Text>}
          </View>
          {admin && (
            <CompanyAction
              title={"Guardar datos de la empresa"}
              icon={Check}
              onPress={() => void save()}
              disabled={disabled}
            />
          )}
        </>
      )}
      {confirmDelete && (
        <Modal
          transparent
          visible
          animationType={reduced ? "none" : "fade"}
          onRequestClose={() => setConfirmDelete(false)}
        >
          <View style={s.overlay}>
            <View
              role="dialog"
              accessibilityViewIsModal
              accessibilityLabel="Eliminar logotipo institucional"
              style={s.dialog}
            >
              <View style={s.toolbar}>
                <Text accessibilityRole="header" style={s.heading}>
                  Eliminar logotipo institucional
                </Text>
                {
                  <CompanyAction
                    title={"Cerrar confirmación"}
                    icon={X}
                    onPress={() => setConfirmDelete(false)}
                  />
                }
              </View>
              <ScrollView>
                <Text style={s.value}>
                  Se eliminará el logotipo usado en los próximos reportes PDF.
                  Los datos de la empresa se conservarán.
                </Text>
              </ScrollView>
              <View style={s.actions}>
                {
                  <CompanyAction
                    title={"Cancelar"}
                    icon={X}
                    onPress={() => setConfirmDelete(false)}
                  />
                }
                {
                  <CompanyAction
                    title={"Confirmar eliminación del logotipo"}
                    icon={Trash2}
                    onPress={() => void remove()}
                    disabled={busy}
                    danger={true}
                  />
                }
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
function CompanyAction({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  danger = false,
}: {
  title: string;
  icon: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { color, styles: s } = useDesign(styles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, danger && s.danger, disabled && { opacity: 0.5 }]}
    >
      <Icon size={18} color={danger ? color.error : color.primary} />
      <Text style={[s.action, danger && { color: color.error }]}>{title}</Text>
    </Pressable>
  );
}
function styles(c: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    toolbar: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md,
    },
    titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    heading: { fontSize: 18, fontWeight: "600", color: c.ink },
    fields: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
    field: { flexBasis: "46%", flexGrow: 1, minWidth: 200, gap: spacing.sm },
    wide: { flexBasis: "100%" },
    label: { fontSize: 13, fontWeight: "600", color: c.muted },
    value: { fontSize: 14, lineHeight: 22, color: c.ink },
    muted: { fontSize: 13, lineHeight: 20, color: c.muted },
    input: {
      minHeight: 44,
      borderWidth: 1,
      borderColor: c.controlBorder,
      backgroundColor: c.input,
      color: c.ink,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 14,
    },
    button: {
      minHeight: 44,
      maxWidth: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      alignSelf: "flex-start",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: 12,
      backgroundColor: c.soft,
    },
    action: {
      fontSize: 14,
      fontWeight: "600",
      color: c.primary,
      flexShrink: 1,
    },
    danger: { backgroundColor: c.errorBg },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    logoPanel: {
      gap: spacing.md,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderColor: c.border,
    },
    logo: {
      width: 220,
      height: 100,
      maxWidth: "100%",
      backgroundColor: "#FFFFFF",
      borderRadius: 8,
    },
    error: {
      color: c.error,
      backgroundColor: c.errorBg,
      padding: spacing.md,
      borderRadius: 12,
    },
    notice: {
      color: c.primary,
      backgroundColor: c.soft,
      padding: spacing.md,
      borderRadius: 12,
    },
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    dialog: {
      width: "100%",
      maxWidth: 560,
      maxHeight: "85%",
      padding: spacing.lg,
      gap: spacing.lg,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
    },
  });
}
