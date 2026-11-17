// Confere os links e arquivos locais referenciados pelo protótipo.
// Uso: node scripts/verificar.cjs
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const IGNORAR = new Set(["node_modules", ".git", "docs"]);

function listarHtml(dir) {
  const saida = [];
  const pilha = [dir];
  while (pilha.length) {
    const atual = pilha.pop();
    for (const entrada of fs.readdirSync(atual, { withFileTypes: true })) {
      if (IGNORAR.has(entrada.name)) continue;
      const completo = path.join(atual, entrada.name);
      if (entrada.isDirectory()) pilha.push(completo);
      else if (entrada.name.toLowerCase().endsWith(".html")) saida.push(completo);
    }
  }
  return saida;
}

const htmls = listarHtml(ROOT);
const problemas = [];
let refs = 0;

for (const arquivo of htmls) {
  const texto = fs.readFileSync(arquivo, "utf8");
  const encontrados = [...texto.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const ref of encontrados) {
    if (/^(https?:|mailto:|tel:|data:|#|javascript:|\/\/)/i.test(ref)) continue;
    if (ref.includes("${") || ref.includes("[favicon")) continue;
    const limpo = ref.split("#")[0].split("?")[0];
    if (!limpo) continue;
    refs += 1;
    const alvo = limpo.startsWith("/")
      ? path.join(ROOT, limpo.replace(/^\//, ""))
      : path.resolve(path.dirname(arquivo), limpo);
    const existe =
      fs.existsSync(alvo) ||
      fs.existsSync(alvo + ".html") ||
      fs.existsSync(path.join(alvo, "index.html"));
    if (!existe) problemas.push(`${path.relative(ROOT, arquivo)} -> ${ref}`);
  }
}

console.log(`${htmls.length} páginas, ${refs} referências locais, ${problemas.length} quebradas.`);
for (const problema of problemas) console.log(`  ! ${problema}`);
if (problemas.length) process.exitCode = 1;
