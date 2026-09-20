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
Copy-Item -Recurse ".vercel" "dist\.vercel" -Force
Set-Location "$RepoRoot\apps\livreur\dist"
vercel --prod
Assert-LastExitCode "vercel --prod (livreur)"

# ------------------------------------------------------------------------------
Set-Location $RepoRoot
Write-Host ""
Write-Host "Termine -- Livreur web deploye en production." -ForegroundColor Green
