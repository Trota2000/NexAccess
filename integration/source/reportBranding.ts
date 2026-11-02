import { Asset } from "expo-asset";
import { Platform } from "react-native";
import { ApiClient } from "./client";
import { CompanyBranding, isLogoDataUrl, loadCompanyBranding } from "./company";

let defaultLogo: string | undefined;
async function nexAccessLogo(): Promise<string> {
  if (defaultLogo) return defaultLogo;
  const asset = Asset.fromModule(
    require("../../assets/brand/nexaccess-logo.png"),
  );
  await asset.downloadAsync();
  let data: string;
  if (Platform.OS === "web") {
    const response = await fetch(asset.localUri ?? asset.uri);
    if (!response.ok)
      throw new Error("No se pudo cargar el logo de NexAccess.");
    const blob = await response.blob();
    data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () =>
        reject(new Error("No se pudo leer el logo de NexAccess."));
      reader.onabort = reader.onerror;
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  } else {
    const { File } = await import("expo-file-system");
    data = `data:image/png;base64,${await new File(asset.localUri ?? asset.uri).base64()}`;
  }
  if (!isLogoDataUrl(data))
    throw new Error("El logo de NexAccess no es válido.");
  defaultLogo = data;
  return data;
}

export async function loadReportBranding(
  client: ApiClient,
): Promise<CompanyBranding> {
  const branding = await loadCompanyBranding(client);
  // An absent company/logo is different from a network, permission or image error.
  return branding?.logoDataUrl
    ? branding
    : { ...branding, logoDataUrl: await nexAccessLogo() };
}
