# ============================================================================
# apply-address-delete-and-gps-fixes.ps1
#
# Corrige deux bugs remontes par Krys apres test reel sur app client :
#   1. Suppression d'adresse (icone corbeille) qui ne fait rien : la
#      suppression echouait en base (contrainte de cle etrangere -- une
#      commande passee reference encore l'adresse) et l'erreur etait avalee
#      en silence cote app. On renvoie desormais un message clair (API) et on
#      l'affiche a l'utilisateur (app) au lieu de rester muet.
#   2. "Utiliser ma position actuelle" qui marche sur Android mais pas sur
#      iOS : app.json de l'app client n'a pas les cles de permission iOS
#      (contrairement a apps/livreur qui les a deja), et la verification de
#      permission separee d'expo-location n'est pas fiable sur Safari/iOS --
#      on la saute sur web et on laisse getCurrentPositionAsync declencher le
#      prompt natif du navigateur lui-meme.
#
# A executer depuis la RACINE du repo golfeexpress.
# ============================================================================

$ErrorActionPreference = "Stop"

function Write-FileUtf8NoBom {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Content
    )
    $dir = Split-Path -Parent $Path
    if ($dir) { [System.IO.Directory]::CreateDirectory($dir) | Out-Null }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
    Write-Host "Ecrit : $Path"
}

function Update-FileContent {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Old,
        [Parameter(Mandatory=$true)][string]$New
    )
    $content = [System.IO.File]::ReadAllText($Path)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false

    if ($content.Contains($Old)) {
        $updated = $content.Replace($Old, $New)
        [System.IO.File]::WriteAllText($Path, $updated, $utf8NoBom)
        Write-Host "Modifie : $Path"
        return
    }

    # Repli : tolere les lignes "vides" avec espaces de fin invisibles.
    $oldLines = $Old -split "`n"
    $patternParts = foreach ($line in $oldLines) {
        if ($line.Trim().Length -eq 0) { '[ \t]*' } else { [regex]::Escape($line) }
    }
    $pattern = [string]::Join("`n", $patternParts)
    $regexMatches = [regex]::Matches($content, $pattern)

    if ($regexMatches.Count -eq 1) {
        $m = $regexMatches[0]
        $updated = $content.Substring(0, $m.Index) + $New + $content.Substring($m.Index + $m.Length)
        [System.IO.File]::WriteAllText($Path, $updated, $utf8NoBom)
        Write-Host "Modifie (espaces de fin de ligne tolerees) : $Path"
        return
    }
    if ($regexMatches.Count -gt 1) {
        throw "Ancien texte trouve plusieurs fois dans $Path (ambigu) -- edition annulee, verifie ce fichier a la main."
    }

    # Deja applique lors d'une execution precedente : on n'echoue pas.
    if ($content.Contains($New)) {
        Write-Host "Deja applique, ignore : $Path"
        return
    }

    throw "Ancien texte introuvable dans $Path (le fichier a peut-etre change depuis) -- edition annulee, verifie ce fichier a la main."
}

# ============================================================================
# 1. apps/api -- DELETE /api/addresses/[addressId] : message clair au lieu
#    d'un 500 generique quand l'adresse est encore liee a une commande.
# ============================================================================

$addressRoutePath = "apps/api/src/app/api/addresses/[addressId]/route.ts"

Update-FileContent -Path $addressRoutePath `
  -Old @'
import type { Prisma } from "@prisma/client";
'@ `
  -New @'
import { Prisma } from "@prisma/client";
'@

Update-FileContent -Path $addressRoutePath `
  -Old @'
async function deleteHandler(req: NextRequest, ctx: { params: { addressId: string } }) {
  const auth = await requireAuth(req);
  await getOwnedAddressOrThrow(auth.userId, ctx.params.addressId);

  await prisma.address.delete({ where: { id: ctx.params.addressId } });

  return NextResponse.json({ success: true });
}
'@ `
  -New @'
async function deleteHandler(req: NextRequest, ctx: { params: { addressId: string } }) {
  const auth = await requireAuth(req);
  await getOwnedAddressOrThrow(auth.userId, ctx.params.addressId);

  try {
    await prisma.address.delete({ where: { id: ctx.params.addressId } });
  } catch (err) {
    // P2003 = violation de contrainte de cle etrangere -- cette adresse est
    // encore referencee par au moins une commande passee (Order.fromAddressId
    // ou toAddressId, sans cascade volontaire pour ne jamais perdre
    // l'adresse d'une commande historique). On refuse la suppression avec un
    // message clair plutot que de laisser remonter une erreur 500 generique.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      throw new ApiError(409, "Cette adresse est utilisee par une commande passee et ne peut pas etre supprimee.");
    }
    throw err;
  }

  return NextResponse.json({ success: true });
}
'@

# ============================================================================
# 2. apps/client -- AddressPickerScreen.tsx : afficher l'erreur de
#    suppression au lieu de l'avaler, et rendre la geolocalisation fiable
#    sur web/Safari.
# ============================================================================

$addressPickerPath = "apps/client/src/screens/AddressPickerScreen.tsx"

Update-FileContent -Path $addressPickerPath `
  -Old @'
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useAddressStore } from "@/store/useAddressStore";
import { AddAddressForm } from "@/components/AddAddressForm";
import type { Address } from "@golfeexpress/types";
'@ `
  -New @'
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Modal, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useAddressStore } from "@/store/useAddressStore";
import { AddAddressForm } from "@/components/AddAddressForm";
import { ApiRequestError } from "@/services/apiClient";
import type { Address } from "@golfeexpress/types";
'@

Update-FileContent -Path $addressPickerPath `
  -Old @'
  async function handleUseCurrentLocation() {
    setLocating(true);
    try {
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== "granted") {
        Alert.alert(
          "Localisation refusée",
          "Autorisez l'accès à votre position dans les réglages pour utiliser cette fonctionnalité."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
'@ `
  -New @'
  async function handleUseCurrentLocation() {
    setLocating(true);
    try {
      // Sur web (notamment Safari iOS), la vérification de permission
      // séparée d'expo-location n'est pas fiable (l'API Permissions n'est
      // pas bien supportée) et peut refuser à tort. On saute donc cette
      // étape sur web : getCurrentPositionAsync déclenche directement le
      // prompt natif du navigateur, qui gère la permission lui-même. Sur
      // natif (iOS/Android), on garde la vérification explicite pour
      // afficher un message clair si refusée.
      if (Platform.OS !== "web") {
        const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
        if (permissionStatus !== "granted") {
          Alert.alert(
            "Localisation refusée",
            "Autorisez l'accès à votre position dans les réglages pour utiliser cette fonctionnalité."
          );
          return;
        }
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
'@

Update-FileContent -Path $addressPickerPath `
  -Old @'
      const newlyAdded = useAddressStore.getState().addresses.at(-1);
      if (newlyAdded) handleSelect(newlyAdded);
    } catch (err) {
      Alert.alert("Erreur", "Impossible de récupérer votre position. Vérifiez que le GPS est activé.");
    } finally {
      setLocating(false);
    }
  }
'@ `
  -New @'
      const newlyAdded = useAddressStore.getState().addresses.at(-1);
      if (newlyAdded) handleSelect(newlyAdded);
    } catch (err) {
      // Log conservé pour diagnostiquer plus précisément une prochaine fois
      // si le message générique ci-dessous ne suffit pas (refus navigateur
      // vs service de géocodage en échec vs GPS matériel indisponible).
      console.error("[AddressPicker] Erreur géolocalisation:", err);
      Alert.alert("Erreur", "Impossible de récupérer votre position. Vérifiez que le GPS est activé.");
    } finally {
      setLocating(false);
    }
  }
'@

Update-FileContent -Path $addressPickerPath `
  -Old @'
  async function handleDelete(addressId: string) {
    setDeletingId(addressId);
    try {
      await removeAddress(addressId);
    } catch {
      // Échec silencieux acceptable ici — l'adresse reste simplement affichée, le Client peut réessayer.
    } finally {
      setDeletingId(null);
    }
  }
'@ `
  -New @'
  async function handleDelete(addressId: string) {
    setDeletingId(addressId);
    try {
      await removeAddress(addressId);
    } catch (err) {
      // On affiche désormais l'erreur réelle (ex: "adresse utilisée par une
      // commande passée") au lieu de l'avaler en silence -- avant ce
      // correctif, l'adresse restait affichée après un clic sur la corbeille
      // sans aucune explication.
      const message =
        err instanceof ApiRequestError ? err.message : "Impossible de supprimer cette adresse pour le moment.";
      Alert.alert("Suppression impossible", message);
    } finally {
      setDeletingId(null);
    }
  }
'@

# ============================================================================
# 3. apps/client/app.json -- cles de permission iOS manquantes (deja
#    presentes cote apps/livreur/app.json, servi de reference ici).
# ============================================================================

Update-FileContent -Path "apps/client/app.json" `
  -Old @'
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "fr.golfeexpress.client"
    },
'@ `
  -New @'
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "fr.golfeexpress.client",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Do You Geckoo utilise votre position pour vous proposer les commerçants les plus proches et faciliter la sélection de votre adresse de livraison."
      }
    },
'@

# ============================================================================
Write-Host ""
Write-Host "=== Termine ===" -ForegroundColor Green
Write-Host "Pour tester en local puis redeployer le web :"
Write-Host "  cd apps/client"
Write-Host "  npx expo export -p web"
Write-Host "  Copy-Item -Recurse .vercel dist\.vercel -Force"
Write-Host "  cd dist"
Write-Host "  vercel --prod"
Write-Host "  cd ../.."
Write-Host ""
Write-Host "NOTE : la correction GPS iOS (app.json) ne prendra effet dans une"
Write-Host "app NATIVE (App Store/TestFlight/EAS Build) qu'au prochain build --"
Write-Host "elle n'affecte pas le web. La correction Safari/web (verification"
Write-Host "de permission sautee sur web), elle, est active des le redeploiement web ci-dessus."
Write-Host ""
Write-Host "Pense aussi a redeployer apps/api (git push suffit si l'auto-deploy"
Write-Host "GitHub est actif) pour que le message d'erreur de suppression d'adresse soit actif."
Write-Host ""
