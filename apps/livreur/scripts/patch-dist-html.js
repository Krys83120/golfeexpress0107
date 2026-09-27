/**
 * Injecte les balises PWA (apple-touch-icon, manifest) dans dist/index.html
 * juste apres `npx expo export -p web`.
 *
 * Pourquoi ce script existe (27/09/2026) : avec ce projet (app.json
 * "bundler": "metro", "output": "single"), `expo export -p web` GENERE son
 * propre index.html minimal a partir de app.json (theme-color,
 * description, favicon...) et IGNORE completement un eventuel template
 * personnalise dans web/index.html (contrairement a l'ancien
 * @expo/webpack-config, qui respectait ce fichier). Des balises
 * <link rel="apple-touch-icon"> et <link rel="manifest"> ajoutees a la
 * main dans web/index.html n'ont donc AUCUN effet sur le HTML reellement
 * deploye -- d'ou l'icone de l'app qui retombait sur le favicon generique
 * a l'installation (iOS ET Android), meme apres correction des fichiers
 * d'icones eux-memes.
 *
 * Usage : depuis apps/livreur, apres `npx expo export -p web` et AVANT de
 * deployer (`cd dist && vercel --prod`) :
 *   node scripts/patch-dist-html.js
 */
const fs = require("fs");
const path = require("path");

const distIndexPath = path.join(__dirname, "..", "dist", "index.html");

if (!fs.existsSync(distIndexPath)) {
  console.error(`[patch-dist-html] Introuvable : ${distIndexPath} -- as-tu bien lance "npx expo export -p web" avant ce script ?`);
  process.exit(1);
}

let html = fs.readFileSync(distIndexPath, "utf8");

if (html.includes("apple-touch-icon")) {
  console.log("[patch-dist-html] Balises deja presentes, rien a faire.");
  process.exit(0);
}

const NEEDLE = '<link rel="icon" href="/favicon.ico" />';
const INJECT = '<link rel="apple-touch-icon" href="/apple-touch-icon.png" /><link rel="manifest" href="/manifest.json" />';

if (!html.includes(NEEDLE)) {
  console.error("[patch-dist-html] Balise <link rel=\"icon\"> introuvable dans dist/index.html -- le format genere par Expo a peut-etre change, contacter Claude pour ajuster ce script.");
  process.exit(1);
}

html = html.replace(NEEDLE, NEEDLE + INJECT);
fs.writeFileSync(distIndexPath, html, "utf8");
console.log("[patch-dist-html] Balises apple-touch-icon + manifest injectees dans dist/index.html.");
