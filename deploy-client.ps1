# ==============================================================================
# Deploiement : Client web (apps/client) -- mode invite (parcours du
# catalogue sans compte) + correctif Smartlook
# ==============================================================================
# Meme recette que l'etape 3/4 de deploy-carte-logos-et-import-csv.ps1 --
# extraite ici en script autonome pour ne redeployer QUE Client web, sans
# repasser par API/Admin/Livreur a chaque fois.
#
# Client web est deploye comme un export web statique autonome (projet
# Vercel "deploy-client", sans lien avec le monorepo) -- toujours depuis son
# propre dossier `dist`.
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
Step "Deploiement Client web (apps/client)"
Set-Location "$RepoRoot\apps\client"
npx expo export -p web
Assert-LastExitCode "expo export (client)"

# Le bundler Metro d'Expo (SDK 54, sans expo-router) ne genere PAS de manifest
# PWA lui-meme -- app.json/web.favicon ne sert qu'a produire favicon.ico (une
# icone minuscule). Sans <link rel="manifest">, Chrome/Android n'a que ce
# favicon.ico pour l'icone "Ajouter a l'ecran d'accueil", d'ou l'icone floue.
# public/manifest.json + public/icon-*.png (copies telles quelles dans dist/
# par `expo export -p web`) fournissent les vraies icones ; on injecte ici le
# lien vers ce manifest (et l'apple-touch-icon) dans dist/index.html, qu'Expo
# genere lui-meme sans tenir compte de web/index.html pour ce bundler.
Step "Injection du manifest PWA dans dist/index.html (client)"
$indexPath = "dist\index.html"
$html = Get-Content $indexPath -Raw
$pwaTags = '<link rel="manifest" href="/manifest.json"><link rel="apple-touch-icon" href="/icon-192.png">'
if ($html -notmatch [regex]::Escape($pwaTags)) {
    $html = $html -replace "</head>", "$pwaTags</head>"
    Set-Content -Path $indexPath -Value $html -NoNewline -Encoding utf8
}

# Meme raison que ci-dessus : web/index.html est ignore par ce bundler, donc les
# balises Open Graph qui y sont ecrites n'arrivaient JAMAIS en production --
# Facebook/WhatsApp ne trouvaient ni titre, ni description, ni image sur
# commander.doyougeckoo.fr, et affichaient leur avertissement "arnaque" sur les
# liens partages (constate le 04/10/2026). On les injecte donc ici aussi, avec
# le noindex (qui n'etait lui non plus jamais publie). Accents ecrits en
# entites HTML pour que ce script reste en ASCII pur (PowerShell 5 lit les
# fichiers sans BOM en ANSI).
Step "Injection des balises Open Graph + noindex dans dist/index.html (client)"
$html = Get-Content $indexPath -Raw
if ($html -notmatch 'property="og:title"') {
    $ogTags = '<meta name="robots" content="noindex, nofollow">' +
        '<meta property="og:type" content="website">' +
        '<meta property="og:site_name" content="Do You Geckoo">' +
        '<meta property="og:title" content="Do You Geckoo">' +
        '<meta property="og:description" content="Restaurant ? Courses ? Colis ? Geckoo it. Livraison locale du Golfe de Saint-Tropez.">' +
        '<meta property="og:image" content="https://hqofwdrgtxvpnfwhaefn.supabase.co/storage/v1/object/public/branding-assets/og-commander.png">' +
        '<meta property="og:url" content="https://commander.doyougeckoo.fr/">' +
        '<meta name="twitter:card" content="summary_large_image">'
    $html = $html -replace "</head>", "$ogTags</head>"
    Set-Content -Path $indexPath -Value $html -NoNewline -Encoding utf8
}

# Liaison de dist au projet Vercel "golfeexpress0107-client" par un `vercel link`
# (comme pour les deploiements manuels) plutot que par la copie de
# apps\client\.vercel : cette copie perimee a fait echouer le deploiement du
# Livreur avec "Not authorized" (06/10/2026). Le domaine commander.doyougeckoo.fr
# est attache a ce projet : pas d'alias a poser.
Step "Liaison de dist au projet Vercel golfeexpress0107-client"
Set-Location "$RepoRoot\apps\client\dist"
vercel link --yes --project golfeexpress0107-client
Assert-LastExitCode "vercel link (client)"

Step "Deploiement en production (vercel --prod)"
vercel --prod
Assert-LastExitCode "vercel --prod (client)"

# ------------------------------------------------------------------------------
Set-Location $RepoRoot
Write-Host ""
Write-Host "Termine -- Client web deploye en production." -ForegroundColor Green
