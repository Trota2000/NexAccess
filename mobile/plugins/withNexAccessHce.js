/* global __dirname */
const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

// Source of truth lives outside generated android/ (Expo CNG).
module.exports = function withNexAccessHce(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest["uses-permission"] ??= [];
    if (
      !manifest["uses-permission"].some(
        (p) => p.$["android:name"] === "android.permission.NFC",
      )
    )
      manifest["uses-permission"].push({
        $: { "android:name": "android.permission.NFC" },
      });
    manifest["uses-feature"] ??= [];
    for (const name of ["android.hardware.nfc", "android.hardware.nfc.hce"])
      if (!manifest["uses-feature"].some((p) => p.$["android:name"] === name))
        manifest["uses-feature"].push({
          $: { "android:name": name, "android:required": "false" },
        });
    const app = manifest.application[0];
    app.service ??= [];
    app.service = app.service.filter(
      (s) => s.$["android:name"] !== "net.nexaccess.hce.NexAccessHceService",
    );
    app.service.push({
      $: {
        "android:name": "net.nexaccess.hce.NexAccessHceService",
        "android:exported": "true",
        "android:permission": "android.permission.BIND_NFC_SERVICE",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name":
                  "android.nfc.cardemulation.action.HOST_APDU_SERVICE",
              },
            },
          ],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.nfc.cardemulation.host_apdu_service",
            "android:resource": "@xml/nexaccess_hce",
          },
        },
      ],
    });
    return mod;
  });
  config = withMainApplication(config, (mod) => {
    const marker = "add(net.nexaccess.hce.NexAccessHcePackage())";
    if (!mod.modResults.contents.includes(marker)) {
      const anchor = "PackageList(this).packages.apply {";
      if (!mod.modResults.contents.includes(anchor))
        throw new Error("NexAccess HCE: unexpected MainApplication template");
      mod.modResults.contents = mod.modResults.contents.replace(
        anchor,
        `${anchor}\n          ${marker}`,
      );
    }
    return mod;
  });
  return withDangerousMod(config, [
    "android",
    async (mod) => {
      const root = mod.modRequest.platformProjectRoot;
      const target = path.join(root, "app/src/main/java/net/nexaccess/hce");
      await fs.mkdir(target, { recursive: true });
      const source = path.join(__dirname, "nexaccess-hce");
      for (const file of await fs.readdir(source))
        if (file.endsWith(".java"))
          await fs.copyFile(path.join(source, file), path.join(target, file));
      const xml = path.join(root, "app/src/main/res/xml");
      await fs.mkdir(xml, { recursive: true });
      await fs.copyFile(
        path.join(source, "nexaccess_hce.xml"),
        path.join(xml, "nexaccess_hce.xml"),
      );
      return mod;
    },
  ]);
};
