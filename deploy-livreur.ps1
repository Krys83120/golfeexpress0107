# ==============================================================================
# Deploiement : Livreur web (apps/livreur) -- notifications push "commande a
# proximite" (VAPID, service worker, reglage rayon depuis Admin)
# ==============================================================================
# Meme recette que deploy-client.ps1 : Livreur web est deploye comme un
# export web statique autonome (projet Vercel "deploy-livreur", sans lien
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

Copy-Item -Recurse ".vercel" "dist\.vercel" -Force
Set-Location "$RepoRoot\apps\livreur\dist"
vercel --prod
Assert-LastExitCode "vercel --prod (livreur)"

# ------------------------------------------------------------------------------
Set-Location $RepoRoot
Write-Host ""
Write-Host "Termine -- Livreur web deploye en production." -ForegroundColor Green
