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
Copy-Item -Recurse ".vercel" "dist\.vercel" -Force
Set-Location "$RepoRoot\apps\client\dist"
vercel --prod
Assert-LastExitCode "vercel --prod (client)"

# ------------------------------------------------------------------------------
Set-Location $RepoRoot
Write-Host ""
Write-Host "Termine -- Client web deploye en production." -ForegroundColor Green
