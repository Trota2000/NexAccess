/* global __dirname */
const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

module.exports = function withNexAccessBle(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest["uses-permission"] ??= [];
    for (const [name, extra] of [
      ["BLUETOOTH", { "android:maxSdkVersion": "30" }],
      ["BLUETOOTH_ADMIN", { "android:maxSdkVersion": "30" }],
      ["ACCESS_FINE_LOCATION", { "android:maxSdkVersion": "30" }],
      ["BLUETOOTH_SCAN", { "android:usesPermissionFlags": "neverForLocation" }],
      ["BLUETOOTH_CONNECT", {}],
      ["FOREGROUND_SERVICE", {}],
      ["FOREGROUND_SERVICE_CONNECTED_DEVICE", {}],
      ["POST_NOTIFICATIONS", {}],
    ]) {
      const full = `android.permission.${name}`;
      if (
        !manifest["uses-permission"].some((p) => p.$["android:name"] === full)
      )
        manifest["uses-permission"].push({
          $: { "android:name": full, ...extra },
        });
    }
    manifest["uses-feature"] ??= [];
    if (
      !manifest["uses-feature"].some(
        (f) => f.$["android:name"] === "android.hardware.bluetooth_le",
      )
    )
      manifest["uses-feature"].push({
        $: {
          "android:name": "android.hardware.bluetooth_le",
          "android:required": "false",
        },
      });
    const app = manifest.application[0];
    app.service ??= [];
    app.service = app.service.filter(
      (s) => s.$["android:name"] !== "net.nexaccess.ble.NexAccessBleService",
    );
    app.service.push({
      $: {
        "android:name": "net.nexaccess.ble.NexAccessBleService",
        "android:exported": "false",
        "android:foregroundServiceType": "connectedDevice",
      },
    });
    return mod;
  });
  config = withMainApplication(config, (mod) => {
    const marker = "add(net.nexaccess.ble.NexAccessBlePackage())";
    const anchor = "PackageList(this).packages.apply {";
    if (!mod.modResults.contents.includes(marker)) {
      if (!mod.modResults.contents.includes(anchor))
        throw new Error("NexAccess BLE: unexpected MainApplication template");
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
      const target = path.join(
        mod.modRequest.platformProjectRoot,
        "app/src/main/java/net/nexaccess/ble",
      );
      await fs.mkdir(target, { recursive: true });
      const source = path.join(__dirname, "nexaccess-ble");
      for (const file of await fs.readdir(source))
        if (file.endsWith(".java"))
          await fs.copyFile(path.join(source, file), path.join(target, file));
      return mod;
    },
  ]);
};
