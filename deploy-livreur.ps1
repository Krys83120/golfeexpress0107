# ==============================================================================
# Deploiement : Livreur web (apps/livreur) -- notifications push "commande a
# proximite" (VAPID, service worker, reglage rayon depuis Admin)
# ==============================================================================
# Meme recette que deploy-client.ps1 : Livreur web est deploye comme un
# export web statique autonome (projet Vercel "golfeexpress0107-livreur", sans lien
# avec le monorepo) -- il ne fait PAS partie des deploiements automatiques
# declenches par un `git push` (voir apps/api / apps/admin / apps/pro / www
# ci-dessus, qui eux se redeploient tout seuls). Toujours depuis son propre
# dossier `dist`.
#
# Prerequis : etre authentifie sur Vercel (`vercel login` deja fait), et
# lancer ce script depuis PowerShell a la racine du repo (ou n'importe ou --
# le script se place lui-meme dans le bon dossier au depart).
# ==============================================================================

$ErrorActionPreference = "Stop"

# Racine du monorepo -- a ajuster si votre copie locale est ailleurs.
$RepoRoot = "C:\Golfe0107\golfeexpress"

function Step($message) {
    Write-Host ""
    Write-Host "==> $message" -ForegroundColor Cyan
}

function Assert-LastExitCode($stepName) {
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Echec : $stepName (code de sortie $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
}

# ------------------------------------------------------------------------------
Step "Deploiement Livreur web (apps/livreur)"
Set-Location "$RepoRoot\apps\livreur"
npx expo export -p web
Assert-LastExitCode "expo export (livreur)"

# Le bundler Metro d'Expo (SDK 54, sans expo-router) ne genere PAS de manifest
# PWA lui-meme -- app.json/web.favicon ne sert qu'a produire favicon.ico (une
# icone minuscule). Sans <link rel="manifest">, Chrome/Android n'a que ce
# favicon.ico pour l'icone "Ajouter a l'ecran d'accueil", d'ou l'icone floue.
# public/manifest.json + public/icon-*.png (copies telles quelles dans dist/
# par `expo export -p web`) fournissent les vraies icones ; on injecte ici le
# lien vers ce manifest (et l'apple-touch-icon) dans dist/index.html, qu'Expo
# genere lui-meme sans tenir compte de web/index.html pour ce bundler.
Step "Injection du manifest PWA dans dist/index.html (livreur)"
$indexPath = "dist\index.html"
$html = Get-Content $indexPath -Raw
$pwaTags = '<link rel="manifest" href="/manifest.json"><link rel="apple-touch-icon" href="/icon-192.png">'
if ($html -notmatch [regex]::Escape($pwaTags)) {
    $html = $html -replace "</head>", "$pwaTags</head>"
    Set-Content -Path $indexPath -Value $html -NoNewline -Encoding utf8
}

# Meme raison que ci-dessus : web/index.html est ignore par ce bundler, donc les
# balises Open Graph qui y sont ecrites n'arrivaient JAMAIS en production
# (apercu de lien vide sur Facebook/WhatsApp, avertissement "arnaque" constate
# le 04/10/2026 sur commander.doyougeckoo.fr -- meme cas ici). On les injecte
# donc ici, avec le noindex. Accents en entites HTML pour garder ce script en
# ASCII pur (PowerShell 5 lit les fichiers sans BOM en ANSI).
Step "Injection des balises Open Graph + noindex dans dist/index.html (livreur)"
$html = Get-Content $indexPath -Raw
if ($html -notmatch 'property="og:title"') {
    $ogTags = '<meta name="robots" content="noindex, nofollow">' +
        '<meta property="og:type" content="website">' +
        '<meta property="og:site_name" content="Do You Geckoo">' +
        '<meta property="og:title" content="Do You Geckoo Livreur">' +
        '<meta property="og:description" content="Livrez sur le Golfe de Saint-Tropez, &agrave; votre rythme, mieux pay&eacute;.">' +
        '<meta property="og:image" content="https://hqofwdrgtxvpnfwhaefn.supabase.co/storage/v1/object/public/branding-assets/og-livreur.png">' +
        '<meta property="og:url" content="https://livreur.doyougeckoo.fr/">' +
        '<meta name="twitter:card" content="summary_large_image">'
    $html = $html -replace "</head>", "$ogTags</head>"
    Set-Content -Path $indexPath -Value $html -NoNewline -Encoding utf8
}

# Liaison du dossier dist au projet Vercel "golfeexpress0107-livreur" : on refait
# un `vercel link` ici (comme pour les autres deploiements manuels) au lieu de
# copier apps\livreur\.vercel, dont la liaison perimee faisait echouer
# `vercel --prod` avec "Not authorized" (06/10/2026).
Step "Liaison de dist au projet Vercel golfeexpress0107-livreur"
Set-Location "$RepoRoot\apps\livreur\dist"
vercel link --yes --project golfeexpress0107-livreur
Assert-LastExitCode "vercel link (livreur)"

Step "Deploiement en production (vercel --prod)"
vercel --prod
Assert-LastExitCode "vercel --prod (livreur)"

# `vercel --prod` met a jour l'alias golfeexpress0107-livreur.vercel.app ; le
# domaine livreur.doyougeckoo.fr, lui, doit etre repointe vers cet alias a
# chaque deploiement (le domaine est attache a l'ancien projet deploy-livreur).
Step "Alias livreur.doyougeckoo.fr"
vercel alias set https://golfeexpress0107-livreur.vercel.app livreur.doyougeckoo.fr
Assert-LastExitCode "vercel alias set (livreur)"

# ------------------------------------------------------------------------------
Set-Location $RepoRoot
Write-Host ""
Write-Host "Termine -- Livreur web deploye en production." -ForegroundColor Green
