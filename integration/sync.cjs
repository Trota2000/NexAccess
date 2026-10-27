// Keep both independently installable Expo apps on the same API implementation.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const check = process.argv.includes("--check");
let failed = false;
for (const file of fs.readdirSync(path.join(__dirname, "source"))) {
  const contents = fs.readFileSync(path.join(__dirname, "source", file));
  for (const app of ["web", "mobile"]) {
    const dest = path.join(root, app, "src", "api", file);
    if (check) {
      if (!fs.existsSync(dest) || !contents.equals(fs.readFileSync(dest))) {
        console.error(
          `Actualizar ${app}/src/api/${file} con node integration/sync.cjs`,
        );
        failed = true;
      }
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, contents);
    }
  }
}
for (const app of ["web", "mobile"]) {
  const contents = fs.readFileSync(path.join(__dirname, "metro-proxy.cjs"));
  const dest = path.join(root, app, "metro-proxy.cjs");
  if (check) {
    if (!fs.existsSync(dest) || !contents.equals(fs.readFileSync(dest))) {
      console.error(
        `Actualizar ${app}/metro-proxy.cjs con node integration/sync.cjs`,
      );
      failed = true;
    }
  } else fs.writeFileSync(dest, contents);
}
for (const file of ["nexaccess-logo.png", "nexaccess-symbol.png"]) {
  const contents = fs.readFileSync(path.join(__dirname, "assets", file));
  for (const app of ["web", "mobile"]) {
    const dest = path.join(root, app, "assets", "brand", file);
    if (check) {
      if (!fs.existsSync(dest) || !contents.equals(fs.readFileSync(dest))) {
        console.error(
          `Actualizar ${app}/assets/brand/${file} con node integration/sync.cjs`,
        );
        failed = true;
      }
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, contents);
    }
  }
}
const palettes = JSON.parse(
  fs
    .readFileSync(path.join(__dirname, "source/design-tokens.json"), "utf8")
    .replace(/^\uFEFF/, ""),
);
const variables = Object.entries(palettes)
  .map(
    ([mode, colors]) =>
      `${mode === "light" ? ":root" : 'html[data-theme="dark"]'}{${Object.entries(
        colors,
      )
        .map(([key, value]) => `--nx-${key}:${value}`)
        .join(";")}}`,
  )
  .join("\n");
const css =
  variables +
  "\n" +
  fs.readFileSync(path.join(__dirname, "theme-base.css"), "utf8");
const styleVersion = require("node:crypto")
  .createHash("sha256")
  .update(css)
  .digest("hex")
  .slice(0, 12);
const init = fs.readFileSync(path.join(__dirname, "theme-init.js"), "utf8");
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>%WEB_TITLE%</title><link rel="stylesheet" href="/nexaccess-theme.css?v=${styleVersion}"><script>${init}</script></head><body><noscript>Necesitás JavaScript para usar NexAccess.</noscript><div id="root"></div></body></html>`;
for (const app of ["web", "mobile"]) {
  for (const [name, contents] of [
    ["nexaccess-theme.css", css],
    ["index.html", html],
  ]) {
    const dest = path.join(root, app, "public", name);
    if (check) {
      if (!fs.existsSync(dest) || fs.readFileSync(dest, "utf8") !== contents) {
        console.error(`Actualizar ${app}/public/${name}`);
        failed = true;
      }
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, contents);
    }
  }
}
if (failed) process.exitCode = 1;
else
  console.log(
    check
      ? "Cliente y pantallas API sincronizados."
      : "Cliente y pantallas API copiados a web y mobile.",
  );
