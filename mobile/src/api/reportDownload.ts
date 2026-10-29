import { Platform } from "react-native";
export async function downloadReport(
  data: Blob | unknown,
  format: "PDF" | "JSON",
) {
  const filename = `NexAccess-reporte-${Date.now()}.${format.toLowerCase()}`;
  const mime = format === "PDF" ? "application/pdf" : "application/json";
  const blob =
    format === "PDF"
      ? (data as Blob)
      : new Blob([JSON.stringify(data, null, 2)], { type: mime });
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const Sharing = await import("expo-sharing");
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      "No se puede abrir el menú para guardar este reporte en este dispositivo.",
    );
  const { File, Paths } = await import("expo-file-system");
  const file = new File(Paths.cache, filename);
  try {
    file.create();
    file.write(new Uint8Array(await blob.arrayBuffer()));
    await Sharing.shareAsync(file.uri, {
      mimeType: mime,
      dialogTitle: "Guardar reporte NexAccess",
    });
  } finally {
    if (file.exists) file.delete();
  }
}
