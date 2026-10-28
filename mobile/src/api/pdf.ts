import { Platform } from "react-native";
import { Row } from "./client";
import { reportHtml } from "./reports";
import { CompanyBranding } from "./company";
export async function exportPdf(
  csv: string,
  title: string,
  query: Row,
  branding?: CompanyBranding,
) {
  const html = reportHtml(csv, title, query, branding);
  if (Platform.OS === "web") {
    const frame = document.createElement("iframe");
    frame.title = "Reporte PDF de NexAccess";
    frame.setAttribute("sandbox", "allow-same-origin allow-modals");
    Object.assign(frame.style, {
      position: "fixed",
      width: "1px",
      height: "1px",
      bottom: "0",
      left: "0",
      border: "0",
    });
    await new Promise<void>((resolve, reject) => {
      frame.onload = async () => {
        try {
          const images = Array.from(frame.contentDocument?.images ?? []);
          await Promise.all(images.map((image) => image.decode()));
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          resolve();
        } catch (e) {
          frame.remove();
          reject(e);
        }
      };
      frame.srcdoc = html;
      document.body.appendChild(frame);
    });
    setTimeout(() => frame.remove(), 60000);
    return;
  }
  const Print = await import("expo-print");
  const Sharing = await import("expo-sharing");
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: ".pdf",
      dialogTitle: `NexAccess · ${title}`,
    });
  else await Print.printAsync({ uri });
}
