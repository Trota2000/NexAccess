const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const snapshot = require("./backend-contract.sha256.json");
const backend = process.argv[2];
if (!backend) {
  console.error("Uso: node integration/check-contract.cjs RUTA_DEL_BACKEND");
  process.exit(1);
}
const digest = (file) =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n"))
    .digest("hex");
let failed = false;
for (const [relative, expected] of Object.entries(snapshot.files)) {
  const file = path.join(backend, relative);
  if (!fs.existsSync(file) || digest(file) !== expected) {
    console.error(`Contrato cambió: ${relative}`);
    failed = true;
  }
}
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? ["obj", "bin"].includes(e.name)
          ? []
          : walk(path.join(dir, e.name))
        : e.name.endsWith(".cs")
          ? [path.join(dir, e.name)]
          : [],
    );
}
for (const file of walk(path.join(backend, "src"))) {
  const relative = path.relative(backend, file).split(path.sep).join("/");
  if (!(relative in snapshot.files)) {
    console.error(`Fuente nueva: ${relative}`);
    failed = true;
  }
}
if (failed) process.exitCode = 1;
else
  console.log(
    `Contrato compatible con ${snapshot.repository}@${snapshot.commit}. No verifica la versión desplegada.`,
  );
