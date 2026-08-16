<#
  Applique les changements "Packs Partenaires" (abonnements Stripe pour les Pro).

  Ce script fait 3 choses, dans l'ordre :
    1. Régénère le client Prisma et applique la migration de base de données
       (ajoute stripeCustomerId / stripeSubscriptionId / subscriptionStatus sur Pro).
    2. Te montre ce qui va être commité (git status) et te demande confirmation
       avant de committer/pousser quoi que ce soit.
    3. Pousse sur Git, ce qui déclenche le redéploiement automatique (Vercel)
       de apps/api, apps/pro, apps/admin et apps/www.

  À exécuter depuis PowerShell, où tu veux (le script se déplace lui-même dans
  le dossier du projet).

  Utilisation :
    cd C:\Golfe0107\golfeexpress
    powershell -ExecutionPolicy Bypass -File .\scripts\appliquer-packs-partenaires.ps1

  Si le dossier du projet n'est pas C:\Golfe0107\golfeexpress, passe le chemin :
    .\scripts\appliquer-packs-partenaires.ps1 -ProjectPath "D:\autre\chemin\golfeexpress"
#>

param(
    [string]$ProjectPath = "C:\Golfe0107\golfeexpress"
)

$ErrorActionPreference = "Stop"

function Write-Step($text) {
    Write-Host ""
    Write-Host $text -ForegroundColor Cyan
}

if (-not (Test-Path $ProjectPath)) {
    Write-Host "Dossier introuvable : $ProjectPath" -ForegroundColor Red
    Write-Host "Relance avec -ProjectPath suivi du bon chemin." -ForegroundColor Red
    exit 1
}

Set-Location $ProjectPath
Write-Host "== Packs Partenaires : application des changements ==" -ForegroundColor Green
Write-Host "Dossier de travail : $(Get-Location)"

# --- 1. Dépendances + Prisma ------------------------------------------------

Write-Step "[1/4] Installation des dependances (npm install)..."
npm install

Write-Step "[2/4] Generation du client Prisma..."
npx prisma generate

Write-Step "[3/4] Migration de la base de donnees (ajoute les champs Stripe sur Pro)..."
Write-Host "Si Prisma demande un nom de migration, laisse 'partner_packs_subscription'." -ForegroundColor Yellow
npx prisma migrate dev --name partner_packs_subscription

# --- 2. Verification TypeScript (optionnelle, non bloquante) ---------------

Write-Step "[Optionnel] Verification TypeScript de apps/api..."
try {
    Push-Location "apps/api"
    npx tsc --noEmit
    Write-Host "Compilation OK." -ForegroundColor Green
} catch {
    Write-Host "Avertissement : la verification TypeScript a signale des erreurs (voir ci-dessus)." -ForegroundColor Yellow
    Write-Host "Ce n'est pas forcement bloquant si ces erreurs existaient deja avant ce changement." -ForegroundColor Yellow
} finally {
    Pop-Location
}

# --- 3. Commit + push (déploiement) -----------------------------------------

Write-Step "[4/4] Etat Git actuel :"
git status

Write-Host ""
$confirmation = Read-Host "Committer et pousser ces changements maintenant pour declencher le deploiement ? (o/n)"

if ($confirmation -eq "o" -or $confirmation -eq "O") {
    git add -A
    git commit -m "feat: packs partenaires - abonnement Stripe (Pro + Admin + site vitrine)"
    git push

    Write-Host ""
    Write-Host "== Pousse ! Vercel va redeployer apps/api, apps/pro, apps/admin et apps/www. ==" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Rien n'a ete commite. Relance le script (ou fais-le a la main) quand tu es pret." -ForegroundColor Yellow
}

# --- Rappel manuel : webhook Stripe -----------------------------------------

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " ETAPE MANUELLE RESTANTE (a faire dans le Dashboard Stripe) :"       -ForegroundColor Cyan
Write-Host " Dashboard Stripe > Developpeurs > Webhooks > ton endpoint existant"
Write-Host " '/api/webhooks/stripe' (perimetre 'Votre compte') > Ajouter des evenements :"
Write-Host "   - checkout.session.completed"
Write-Host "   - customer.subscription.updated"
Write-Host "   - customer.subscription.deleted"
Write-Host " (Ne touche PAS au webhook '/api/webhooks/stripe-connect', c'est un endpoint different.)"
Write-Host "==================================================================" -ForegroundColor Cyan
