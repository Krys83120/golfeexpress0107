# ==============================================================================
# Déploiement : comptes employés Pro + traçabilité/statistiques Admin + Z
# ==============================================================================
# Ce script :
#   1. Applique la migration Prisma (ajoute le rôle PRO_EMPLOYEE et le modèle
#      ProEmployee en base -- INDISPENSABLE avant tout déploiement, sinon les
#      nouvelles routes plantent en production dès qu'elles touchent la base)
#   2. Déploie l'API (apps/api)      -> api.doyougeckoo.fr
#   3. Déploie l'app Admin (apps/admin) -> admin.doyougeckoo.fr
#   4. Déploie l'app Pro (apps/pro)  -> pro.doyougeckoo.fr
#
# Prérequis : être authentifié sur Vercel (`vercel login` déjà fait), et
# lancer ce script depuis PowerShell à la racine du repo (ou n'importe où --
# le script se place lui-même dans le bon dossier au départ).
#
# En cas d'erreur à n'importe quelle étape, le script s'arrête immédiatement
# (voir $ErrorActionPreference et les contrôles $LASTEXITCODE ci-dessous) --
# jamais de déploiement à moitié fait sans que vous le sachiez.
# ==============================================================================

$ErrorActionPreference = "Stop"

# Racine du monorepo -- à ajuster si votre copie locale est ailleurs.
$RepoRoot = "C:\Golfe0107\golfeexpress"

function Step($message) {
    Write-Host ""
    Write-Host "==> $message" -ForegroundColor Cyan
}

function Assert-LastExitCode($stepName) {
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Échec : $stepName (code de sortie $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
}

# ------------------------------------------------------------------------------
# 1. Migration Prisma -- ajoute PRO_EMPLOYEE (enum UserRole) et le modèle
#    ProEmployee. Doit être lancée en premier : le code déployé juste après
#    suppose que ces objets existent déjà en base.
# ------------------------------------------------------------------------------
Step "1/4 -- Migration Prisma (PRO_EMPLOYEE + ProEmployee)"
Set-Location $RepoRoot
npx prisma migrate dev --name add_pro_employees
Assert-LastExitCode "migration Prisma"

# ------------------------------------------------------------------------------
# 2. Déploiement API
# ------------------------------------------------------------------------------
Step "2/4 -- Déploiement API (apps/api)"
Set-Location "$RepoRoot\apps\api"
vercel link --yes --project golfeexpress0107-api
Assert-LastExitCode "vercel link (api)"
vercel --prod
Assert-LastExitCode "vercel --prod (api)"

# ------------------------------------------------------------------------------
# 3. Déploiement Admin
# ------------------------------------------------------------------------------
Step "3/4 -- Déploiement Admin (apps/admin)"
Set-Location "$RepoRoot\apps\admin"
vercel link --yes --project golfeexpress0107-admin
Assert-LastExitCode "vercel link (admin)"
vercel --prod
Assert-LastExitCode "vercel --prod (admin)"

# ------------------------------------------------------------------------------
# 4. Déploiement Pro
# ------------------------------------------------------------------------------
Step "4/4 -- Déploiement Pro (apps/pro)"
Set-Location "$RepoRoot\apps\pro"
vercel link --yes --project golfeexpress0107-pro
Assert-LastExitCode "vercel link (pro)"
vercel --prod
Assert-LastExitCode "vercel --prod (pro)"

# ------------------------------------------------------------------------------
Set-Location $RepoRoot
Write-Host ""
Write-Host "✅ Terminé -- migration appliquée, API/Admin/Pro déployés en production." -ForegroundColor Green
Write-Host "   Si l'un des 3 projets n'a pas encore de domaine personnalisé configuré" -ForegroundColor Yellow
Write-Host "   (api/admin/pro.doyougeckoo.fr) côté dashboard Vercel, le déploiement" -ForegroundColor Yellow
Write-Host "   reste accessible via l'URL *.vercel.app affichée ci-dessus par vercel." -ForegroundColor Yellow
