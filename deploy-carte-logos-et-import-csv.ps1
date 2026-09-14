# ==============================================================================
# Deploiement : logos des pros sur la carte (client/admin/livreur) + import
# CSV manuel de menu depuis l'admin (SUPER_ADMIN)
# ==============================================================================
# Ce script deploie les 4 apps concernees par ces deux fonctionnalites :
#   1. API (apps/api)         -> nouvelle route d'import CSV (SUPER_ADMIN)
#   2. Admin (apps/admin)     -> logos sur la carte "Repartition geographique"
#                                 + bouton "Importer un menu (CSV)"
#   3. Client web (apps/client)   -> logos sur la carte "tous les pros"
#   4. Livreur web (apps/livreur) -> logo sur le point de retrait en cours de course
#
# AUCUNE migration Prisma necessaire : le champ Pro.logo existait deja, et
# aucun champ n'a ete ajoute au schema pour ces deux fonctionnalites.
#
# IMPORTANT -- API et Admin sont deployes DEPUIS LA RACINE du repo (pas
# depuis apps/api ou apps/admin) : ces deux projets Vercel ont un "Root
# Directory" configure (apps/api / apps/admin) dans leurs reglages, qui
# suppose que Vercel recoit tout le monorepo puis va lui-meme "entrer" dans
# le bon sous-dossier -- necessaire pour que npm resolve les packages
# partages (@golfeexpress/types, @golfeexpress/ui-tokens). Lancer `vercel
# --prod` depuis l'INTERIEUR de apps/api ou apps/admin envoie uniquement ce
# sous-dossier, et fait planter le build (double application du Root
# Directory, puis npm install qui ne trouve plus le reste du monorepo). Si
# ces reglages "Root Directory" sont un jour retires dans le dashboard
# Vercel, ce script devra etre adapte en consequence.
#
# Client et Livreur sont a l'inverse deployes comme des exports web
# statiques autonomes (projets "deploy-client"/"deploy-livreur", sans lien
# avec le monorepo) -- toujours depuis leur propre dossier `dist`, comme
# avant.
#
# Prerequis : etre authentifie sur Vercel (`vercel login` deja fait), et
# lancer ce script depuis PowerShell a la racine du repo (ou n'importe ou --
# le script se place lui-meme dans le bon dossier au depart).
#
# En cas d'erreur a n'importe quelle etape, le script s'arrete immediatement
# -- jamais de deploiement a moitie fait sans que vous le sachiez.
#
# NOTE -- app LIVREUR native (App Store/Play Store/EAS) : ce script ne
# redeploie QUE la version web (PWA) de apps/livreur, comme pour les
# precedents deploiements de cette app. Si vos livreurs utilisent l'app
# native installee (pas la version web), le logo sur le point de retrait
# n'apparaitra chez eux qu'au prochain build natif (EAS Build) -- ce script
# ne couvre pas cette partie.
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
# 1. Deploiement API -- nouvelle route POST /api/admin/pros/[proId]/products/import
#    Lance depuis la RACINE (voir note en tete de fichier) -- le Root
#    Directory "apps/api" configure cote Vercel se charge de re-entrer dans
#    le bon sous-dossier une fois tout le monorepo recu.
# ------------------------------------------------------------------------------
Step "1/4 -- Deploiement API (apps/api)"
Set-Location $RepoRoot
vercel link --yes --project golfeexpress0107-api
Assert-LastExitCode "vercel link (api)"
vercel --prod
Assert-LastExitCode "vercel --prod (api)"

# ------------------------------------------------------------------------------
# 2. Deploiement Admin -- logos carte + bouton "Importer un menu (CSV)"
#    Meme logique que l'API : depuis la racine, build local du workspace
#    admin pour verifier (typecheck + vite build) avant de deployer.
# ------------------------------------------------------------------------------
Step "2/4 -- Deploiement Admin (apps/admin)"
Set-Location $RepoRoot
npm run build --workspace=apps/admin
Assert-LastExitCode "npm run build (admin)"
vercel link --yes --project golfeexpress0107-admin
Assert-LastExitCode "vercel link (admin)"
vercel --prod
Assert-LastExitCode "vercel --prod (admin)"

# ------------------------------------------------------------------------------
# 3. Deploiement Client web -- logos sur la carte "tous les pros"
# ------------------------------------------------------------------------------
Step "3/4 -- Deploiement Client web (apps/client)"
Set-Location "$RepoRoot\apps\client"
npx expo export -p web
Assert-LastExitCode "expo export (client)"
Copy-Item -Recurse ".vercel" "dist\.vercel" -Force
Set-Location "$RepoRoot\apps\client\dist"
vercel --prod
Assert-LastExitCode "vercel --prod (client)"

# ------------------------------------------------------------------------------
# 4. Deploiement Livreur web -- logo sur le point de retrait en cours de course
# ------------------------------------------------------------------------------
Step "4/4 -- Deploiement Livreur web (apps/livreur)"
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
Write-Host "Termine -- API/Admin/Client web/Livreur web deployes en production." -ForegroundColor Green
Write-Host "Pense a tester l'import CSV depuis une fiche pro (bouton visible" -ForegroundColor Yellow
Write-Host "uniquement si tu es connectee en SUPER_ADMIN) avant de le considerer" -ForegroundColor Yellow
Write-Host "valide en prod." -ForegroundColor Yellow
