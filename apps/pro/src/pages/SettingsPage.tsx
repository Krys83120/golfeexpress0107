import React, { useEffect, useState } from "react";
import type { Pro, OpeningHours, ProCategory } from "@golfeexpress/types";
import {
  fetchMyShopProfile,
  updateMyShopProfile,
  fetchMyOpeningHours,
  updateMyOpeningHours,
  updateMyClosure,
  syncGoogleRating,
  verifySiret,
  updateMyShopAddress,
} from "@/services/shopProfileApi";
import { ImageUploadField } from "@/components/ImageUploadField";
import { uploadProAsset, uploadProKbis, withCacheBust } from "@/services/uploadsApi";
import { getCategoryEmoji, CATEGORY_LABELS } from "@/services/categoryVisuals";
import { MapView, type MapPin } from "@/components/MapView";

const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// Mêmes paliers que le sélecteur "Démarrer la préparation" côté commande
// (ProOrderCard.tsx) — juste pour rester cohérent visuellement, cette
// valeur-ci n'est qu'une indication par défaut affichée sur la fiche
// commerçant, jamais utilisée pour calculer le timing d'une commande réelle.
const PREP_TIME_PRESETS = [10, 15, 20, 30];

export function SettingsPage() {
  const [pro, setPro] = useState<Pro | null>(null);
  const [hours, setHours] = useState<OpeningHours[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  // Champs contrôlés du formulaire "Informations générales"
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState<ProCategory | "">("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [defaultPrepTimeMinutes, setDefaultPrepTimeMinutes] = useState(15);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Fermeture manuelle ("En vacances" / "Fermé exceptionnellement") — ne
  // touche jamais aux horaires hebdomadaires ci-dessus (state `hours`).
  const [isManuallyClosed, setIsManuallyClosed] = useState(false);
  const [closureReason, setClosureReason] = useState<"VACATION" | "CLOSED">("VACATION");
  const [closureUntil, setClosureUntil] = useState("");
  const [closureNote, setClosureNote] = useState("");
  const [savingClosure, setSavingClosure] = useState(false);
  const [closureMessage, setClosureMessage] = useState<string | null>(null);

  // Réseaux sociaux + Google Avis
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [socialMessage, setSocialMessage] = useState<string | null>(null);

  // Informations légales
  const [siret, setSiret] = useState("");
  const [siretVerified, setSiretVerified] = useState(false);
  const [verifyingSiret, setVerifyingSiret] = useState(false);
  const [siretMessage, setSiretMessage] = useState<string | null>(null);
  const [legalName, setLegalName] = useState("");
  const [legalForm, setLegalForm] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [managerFirstName, setManagerFirstName] = useState("");
  const [managerLastName, setManagerLastName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);
  const [savingLegal, setSavingLegal] = useState(false);
  const [legalMessage, setLegalMessage] = useState<string | null>(null);
  const [uploadingKbis, setUploadingKbis] = useState(false);

  // Adresse de l'établissement
  const [street, setStreet] = useState("");
  const [complement, setComplement] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMessage, setAddressMessage] = useState<string | null>(null);

  async function load() {
    setStatus("loading");
    try {
      const [shopProfile, openingHours] = await Promise.all([fetchMyShopProfile(), fetchMyOpeningHours()]);
      setPro(shopProfile);
      setBusinessName(shopProfile.businessName);
      setCategory(shopProfile.category);
      setDescription(shopProfile.description ?? "");
      setPhone(shopProfile.phone);
      setEmailContact(shopProfile.emailContact);
      setDefaultPrepTimeMinutes(shopProfile.defaultPrepTimeMinutes ?? 15);
      setInstagramUrl(shopProfile.instagramUrl ?? "");
      setFacebookUrl(shopProfile.facebookUrl ?? "");
      setTiktokUrl(shopProfile.tiktokUrl ?? "");
      setWebsiteUrl(shopProfile.websiteUrl ?? "");
      setGooglePlaceId(shopProfile.googlePlaceId ?? "");
      setSiret(shopProfile.siret ?? "");
      setSiretVerified(shopProfile.siretVerified ?? false);
      setLegalName(shopProfile.legalName ?? "");
      setLegalForm(shopProfile.legalForm ?? "");
      setVatNumber(shopProfile.vatNumber ?? "");
      setManagerFirstName(shopProfile.managerFirstName ?? "");
      setManagerLastName(shopProfile.managerLastName ?? "");
      setAcceptTerms(!!shopProfile.termsAcceptedAt);
      setTermsAcceptedAt(shopProfile.termsAcceptedAt ?? null);
      setIsManuallyClosed(shopProfile.isManuallyClosed ?? false);
      setClosureReason((shopProfile.manualClosureReason as "VACATION" | "CLOSED") ?? "VACATION");
      setClosureUntil(shopProfile.manualClosureUntil ? shopProfile.manualClosureUntil.slice(0, 10) : "");
      setClosureNote(shopProfile.manualClosureNote ?? "");
      const existingAddress = shopProfile.addresses?.[0];
      if (existingAddress) {
        setStreet(existingAddress.street);
        setComplement(existingAddress.complement ?? "");
        setZipCode(existingAddress.zipCode);
        setCity(existingAddress.city);
      }

      // S'il manque des jours (premier paramétrage), on complète avec des
      // valeurs par défaut "fermé" pour toujours afficher les 7 lignes.
      const byDay = new Map(openingHours.map((h) => [h.dayOfWeek, h]));
      const complete: OpeningHours[] = Array.from({ length: 7 }, (_, dayOfWeek) =>
        byDay.get(dayOfWeek) ?? {
          id: `placeholder-${dayOfWeek}`,
          proId: shopProfile.id,
          dayOfWeek,
          openTime: "09:00",
          closeTime: "18:00",
          isClosed: dayOfWeek === 0,
        }
      );
      setHours(complete);
      setStatus("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les paramètres.");
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateHour(dayOfWeek: number, field: "openTime" | "closeTime" | "isClosed", value: string | boolean) {
    setHours((prev) => prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h)));
  }

  /**
   * Ferme/réouvre la boutique en un clic. N'écrit jamais dans `hours` —
   * les horaires hebdomadaires restent tels quels et se réappliquent
   * automatiquement dès la réouverture (voir PATCH /api/pros/me/closure).
   */
  async function handleToggleClosure(nextClosed: boolean) {
    setSavingClosure(true);
    setClosureMessage(null);
    try {
      const updated = await updateMyClosure({
        isManuallyClosed: nextClosed,
        manualClosureReason: nextClosed ? closureReason : null,
        manualClosureUntil: nextClosed && closureUntil ? closureUntil : null,
        manualClosureNote: nextClosed ? closureNote || null : null,
      });
      setPro(updated);
      setIsManuallyClosed(updated.isManuallyClosed);
      setClosureReason((updated.manualClosureReason as "VACATION" | "CLOSED") ?? "VACATION");
      setClosureMessage(nextClosed ? "Boutique fermée aux clients." : "Boutique réouverte selon vos horaires habituels.");
    } catch (err) {
      setClosureMessage(err instanceof Error ? err.message : "Impossible de mettre à jour le statut.");
    } finally {
      setSavingClosure(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setSaveMessage(null);
    try {
      const updated = await updateMyShopProfile({
        businessName,
        category: category || undefined,
        description,
        phone,
        emailContact,
        defaultPrepTimeMinutes,
      });
      setPro(updated);
      setSaveMessage("Informations enregistrées.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer les informations.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUploadLogo(file: File) {
    if (!pro) return;
    const url = await uploadProAsset(pro.id, "logo", file);
    const updated = await updateMyShopProfile({ logo: withCacheBust(url) });
    setPro(updated);
  }

  async function handleUploadCover(file: File) {
    if (!pro) return;
    const url = await uploadProAsset(pro.id, "cover", file);
    const updated = await updateMyShopProfile({ coverImage: withCacheBust(url) });
    setPro(updated);
  }

  async function handleSaveSocial(e: React.FormEvent) {
    e.preventDefault();
    setSavingSocial(true);
    setSocialMessage(null);
    try {
      const updated = await updateMyShopProfile({
        instagramUrl: instagramUrl.trim() || null,
        facebookUrl: facebookUrl.trim() || null,
        tiktokUrl: tiktokUrl.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        googlePlaceId: googlePlaceId.trim() || null,
      });
      setPro(updated);
      setSocialMessage("✅ Enregistré.");
    } catch (err) {
      setSocialMessage(err instanceof Error ? `❌ ${err.message}` : "❌ Impossible d'enregistrer.");
    } finally {
      setSavingSocial(false);
    }
  }

  async function handleSyncGoogleRating() {
    setSyncingGoogle(true);
    setSocialMessage(null);
    try {
      const result = await syncGoogleRating();
      setPro((prev) =>
        prev
          ? {
              ...prev,
              googleRating: result.googleRating,
              googleRatingCount: result.googleRatingCount,
              googleRatingSyncedAt: result.googleRatingSyncedAt,
            }
          : prev
      );
      setSocialMessage(
        result.googleRating !== null
          ? `✅ Note Google récupérée : ${result.googleRating}⭐ (${result.googleRatingCount} avis)`
          : "⚠️ Aucune note trouvée pour cette fiche Google."
      );
    } catch (err) {
      setSocialMessage(err instanceof Error ? `❌ ${err.message}` : "❌ Échec de la synchronisation.");
    } finally {
      setSyncingGoogle(false);
    }
  }

  async function handleVerifySiret() {
    setVerifyingSiret(true);
    setSiretMessage(null);
    try {
      const result = await verifySiret(siret.trim());
      if (result.valid) {
        setSiretVerified(true);
        setSiretMessage(`✅ SIRET vérifié — ${result.businessName ?? "entreprise trouvée"}.`);
      } else {
        setSiretVerified(false);
        setSiretMessage(`⚠️ ${result.message ?? "SIRET introuvable."}`);
      }
    } catch (err) {
      setSiretMessage(err instanceof Error ? `❌ ${err.message}` : "❌ Échec de la vérification.");
    } finally {
      setVerifyingSiret(false);
    }
  }

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddress(true);
    setAddressMessage(null);
    try {
      const address = await updateMyShopAddress({
        street: street.trim(),
        complement: complement.trim() || null,
        zipCode: zipCode.trim(),
        city: city.trim(),
      });
      setPro((prev) => (prev ? { ...prev, addresses: [{ ...prev.addresses?.[0], ...address, id: prev.addresses?.[0]?.id ?? "", label: "Boutique", isDefault: true }] } : prev));
      setAddressMessage("✅ Adresse enregistrée et localisée sur la carte.");
    } catch (err) {
      setAddressMessage(err instanceof Error ? `❌ ${err.message}` : "❌ Impossible d'enregistrer l'adresse.");
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleUploadKbis(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pro) return;
    setUploadingKbis(true);
    setLegalMessage(null);
    try {
      const url = await uploadProKbis(pro.id, file);
      const updated = await updateMyShopProfile({ kbisUrl: withCacheBust(url) });
      setPro(updated);
      setLegalMessage("✅ Kbis mis à jour.");
    } catch (err) {
      setLegalMessage(err instanceof Error ? `❌ ${err.message}` : "❌ Échec de l'upload du Kbis.");
    } finally {
      setUploadingKbis(false);
    }
  }

  async function handleSaveLegal(e: React.FormEvent) {
    e.preventDefault();
    setSavingLegal(true);
    setLegalMessage(null);
    try {
      const updated = await updateMyShopProfile({
        siret: siret.trim() || undefined,
        legalName: legalName.trim() || null,
        legalForm: legalForm.trim() || null,
        vatNumber: vatNumber.trim() || null,
        managerFirstName: managerFirstName.trim() || null,
        managerLastName: managerLastName.trim() || null,
        ...(acceptTerms && !termsAcceptedAt ? { acceptTerms: true, termsVersion: "1.0" } : {}),
      });
      setPro(updated);
      setSiretVerified(updated.siretVerified);
      setTermsAcceptedAt(updated.termsAcceptedAt ?? null);
      setLegalMessage("✅ Informations légales enregistrées.");
    } catch (err) {
      setLegalMessage(err instanceof Error ? `❌ ${err.message}` : "❌ Impossible d'enregistrer.");
    } finally {
      setSavingLegal(false);
    }
  }

  async function handleSaveHours() {
    setSavingHours(true);
    setSaveMessage(null);
    try {
      const updated = await updateMyOpeningHours(
        hours.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
        }))
      );
      setHours(updated);
      setSaveMessage("Horaires mis à jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer les horaires.");
    } finally {
      setSavingHours(false);
    }
  }

  if (status === "loading") {
    return <p className="p-8 text-center text-sm text-gris">Chargement des paramètres...</p>;
  }

  if (status === "error") {
    return (
      <div className="p-8">
        <div className="rounded-sm bg-red-50 p-4 text-sm text-red-500">
          {error}{" "}
          <button onClick={load} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Paramètres</h1>
        <p className="text-sm text-gris">Informations de votre boutique</p>
      </div>

      {saveMessage && <div className="mb-4 rounded-sm bg-golfe-green/10 p-3 text-sm text-golfe-green">{saveMessage}</div>}

      <form onSubmit={handleSaveProfile} className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-4 font-heading text-base font-bold text-nuit">🏪 Informations générales</h3>

        <div className="mb-5 flex items-start gap-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gris">Logo</label>
            <ImageUploadField
              currentImageUrl={pro?.logo}
              placeholder={pro ? getCategoryEmoji(pro.category) : "🏪"}
              shape="circle"
              onUpload={handleUploadLogo}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-gris">Photo de couverture</label>
            <ImageUploadField
              currentImageUrl={pro?.coverImage}
              placeholder="🖼️"
              shape="banner"
              onUpload={handleUploadCover}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nom commercial" value={businessName} onChange={setBusinessName} />
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Catégorie d'activité</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProCategory)}
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {getCategoryEmoji(key as ProCategory)} {label}
                </option>
              ))}
            </select>
          </div>
          <Field label="SIRET" value={pro?.siret ?? ""} disabled />
          <Field label="Téléphone" value={phone} onChange={setPhone} />
          <Field label="Email de contact" value={emailContact} onChange={setEmailContact} />
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gris">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-gris">Temps de préparation habituel</label>
            <p className="mb-2 text-xs text-gris">
              Indication affichée sur votre fiche commerçant côté Client — n'affecte pas le délai que vous
              choisissez pour chaque commande au moment de démarrer sa préparation.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {PREP_TIME_PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDefaultPrepTimeMinutes(minutes)}
                  className={
                    "rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm " +
                    (defaultPrepTimeMinutes === minutes
                      ? "bg-golfe-green text-white"
                      : "bg-gris-light text-nuit hover:bg-golfe-green/20")
                  }
                >
                  {minutes} min
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={180}
                value={defaultPrepTimeMinutes}
                onChange={(e) => setDefaultPrepTimeMinutes(Number(e.target.value) || 1)}
                className="w-24 rounded-sm border border-gris-light px-2 py-1.5 text-xs"
              />
              <span className="text-xs text-gris">min</span>
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={savingProfile}
          className="mt-5 rounded-sm bg-golfe-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {savingProfile ? "Enregistrement..." : "Enregistrer les informations"}
        </button>
      </form>

      <form onSubmit={handleSaveAddress} className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-4 font-heading text-base font-bold text-nuit">📍 Adresse de l'établissement</h3>
        <p className="mb-4 text-xs text-gris">
          Cette adresse sert de point de retrait pour les livreurs et détermine votre position sur les cartes
          Client et Admin — elle est localisée automatiquement lors de l'enregistrement.
        </p>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gris">Rue</label>
            <input
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Ex: 12 Avenue Charles de Gaulle"
              required
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gris">Complément d'adresse (optionnel)</label>
            <input
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
              placeholder="Bâtiment, étage..."
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Code postal</label>
            <input
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="83120"
              required
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Ville</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Sainte-Maxime"
              required
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
        </div>

        {addressMessage && <p className="mb-4 text-sm">{addressMessage}</p>}

        {pro?.addresses?.[0] && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold text-gris">Position actuelle sur la carte</p>
            <MapView
              pins={[
                {
                  id: pro.id,
                  lat: pro.addresses[0].lat,
                  lng: pro.addresses[0].lng,
                  color: "#2ECC71",
                  label: getCategoryEmoji(pro.category),
                },
              ]}
              height={220}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={savingAddress}
          className="rounded-sm bg-golfe-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {savingAddress ? "Localisation en cours..." : "Enregistrer l'adresse"}
        </button>
      </form>

      <form onSubmit={handleSaveLegal} className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-4 font-heading text-base font-bold text-nuit">⚖️ Informations légales</h3>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold text-gris">SIRET</label>
          <div className="flex gap-2">
            <input
              value={siret}
              onChange={(e) => {
                setSiret(e.target.value);
                setSiretVerified(false);
              }}
              placeholder="14 chiffres"
              maxLength={14}
              className="flex-1 rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleVerifySiret}
              disabled={verifyingSiret || siret.trim().length !== 14}
              className="whitespace-nowrap rounded-sm border border-gris-light px-4 py-2 text-sm font-semibold text-nuit disabled:opacity-50"
            >
              {verifyingSiret ? "Vérification..." : "Vérifier"}
            </button>
          </div>
          {siretVerified && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-golfe-green">✅ SIRET vérifié</p>
          )}
          {siretMessage && <p className="mt-1.5 text-xs">{siretMessage}</p>}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Raison sociale</label>
            <input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Peut différer du nom commercial"
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Forme juridique</label>
            <select
              value={legalForm}
              onChange={(e) => setLegalForm(e.target.value)}
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            >
              <option value="">Choisir...</option>
              <option value="Auto-entrepreneur">Auto-entrepreneur</option>
              <option value="EI">Entreprise Individuelle (EI)</option>
              <option value="EURL">EURL</option>
              <option value="SARL">SARL</option>
              <option value="SAS">SAS</option>
              <option value="SASU">SASU</option>
              <option value="SA">SA</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Prénom du gérant</label>
            <input
              value={managerFirstName}
              onChange={(e) => setManagerFirstName(e.target.value)}
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Nom du gérant</label>
            <input
              value={managerLastName}
              onChange={(e) => setManagerLastName(e.target.value)}
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gris">N° TVA intracommunautaire (si applicable)</label>
            <input
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="FR12345678901"
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mb-4 border-t border-gris-light pt-4">
          <label className="mb-1 block text-xs font-semibold text-gris">
            Extrait Kbis <span className="font-normal text-gris">(obligatoire, de moins de 3 mois)</span>
          </label>

          {pro?.kbisUrl ? (
            (() => {
              const uploadedAt = pro.kbisUploadedAt ? new Date(pro.kbisUploadedAt) : null;
              const ageMs = uploadedAt ? Date.now() - uploadedAt.getTime() : Infinity;
              const isFresh = ageMs < 90 * 24 * 60 * 60 * 1000; // 90 jours ≈ 3 mois
              return (
                <div className="flex items-center gap-3 rounded-sm bg-gris-light p-3">
                  <a
                    href={pro.kbisUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 truncate text-sm font-semibold text-golfe-green underline"
                  >
                    📄 Voir le document envoyé
                  </a>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ backgroundColor: isFresh ? "#E8F5E9" : "#FFF3E0", color: isFresh ? "#2ECC71" : "#FF6B35" }}
                  >
                    {isFresh
                      ? `À jour${uploadedAt ? " (" + uploadedAt.toLocaleDateString("fr-FR") + ")" : ""}`
                      : "⚠️ Plus de 3 mois — à renouveler"}
                  </span>
                </div>
              );
            })()
          ) : (
            <p className="rounded-sm bg-orange-50 p-3 text-sm text-corail">
              ⚠️ Aucun Kbis fourni — nécessaire pour valider votre compte.
            </p>
          )}

          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-sm border border-gris-light px-3.5 py-2 text-xs font-semibold text-nuit hover:bg-gris-light">
            {uploadingKbis ? "Envoi en cours..." : "📤 " + (pro?.kbisUrl ? "Remplacer le Kbis" : "Envoyer mon Kbis")}
            <input type="file" accept="application/pdf,image/*" onChange={handleUploadKbis} disabled={uploadingKbis} className="hidden" />
          </label>
          <p className="mt-1 text-[11px] text-gris">
            Téléchargeable gratuitement sur{" "}
            <a href="https://www.infogreffe.fr" target="_blank" rel="noreferrer" className="underline">
              infogreffe.fr
            </a>{" "}
            avec votre SIRET.
          </p>
        </div>

        <div className="mb-4 border-t border-gris-light pt-4">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-golfe-green"
            />
            <span className="text-sm text-nuit">
              J'accepte les Conditions Générales d'Utilisation et de Vente de Do You Geckoo.
              {termsAcceptedAt && (
                <span className="block text-xs text-gris">
                  Acceptées le {new Date(termsAcceptedAt).toLocaleDateString("fr-FR")}.
                </span>
              )}
            </span>
          </label>
        </div>

        {legalMessage && <p className="mb-4 text-sm">{legalMessage}</p>}

        <button
          type="submit"
          disabled={savingLegal}
          className="rounded-sm bg-golfe-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {savingLegal ? "Enregistrement..." : "Enregistrer les informations légales"}
        </button>
      </form>

      <form onSubmit={handleSaveSocial} className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-4 font-heading text-base font-bold text-nuit">🌐 Réseaux sociaux & Avis Google</h3>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Instagram</label>
            <input
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/votrecompte"
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Facebook</label>
            <input
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/votrepage"
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">TikTok</label>
            <input
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
              placeholder="https://tiktok.com/@votrecompte"
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Site web</label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://votresite.fr"
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mb-4 border-t border-gris-light pt-4">
          <label className="mb-1 block text-xs font-semibold text-gris">Identifiant de fiche Google (Place ID)</label>
          <input
            value={googlePlaceId}
            onChange={(e) => setGooglePlaceId(e.target.value)}
            placeholder="Ex: ChIJN1t_tDeuEmsRUsoyG83frY4"
            className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
          />
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-golfe-green">
              Comment trouver mon Place ID ?
            </summary>
            <ol className="mt-2 list-decimal pl-4 text-xs text-gris" style={{ lineHeight: 1.6 }}>
              <li>
                Allez sur{" "}
                <a
                  href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  le localisateur officiel de Place ID Google
                </a>
              </li>
              <li>Recherchez le nom exact de votre établissement dans la barre de recherche de la carte</li>
              <li>Cliquez sur votre établissement une fois qu'il apparaît sur la carte</li>
              <li>Copiez la valeur "Place ID" qui s'affiche dans l'encadré à droite</li>
              <li>Collez-la ci-dessus et enregistrez</li>
            </ol>
          </details>

          {pro?.googleRating !== null && pro?.googleRating !== undefined && (
            <div className="mt-3 flex items-center gap-2 rounded-sm bg-gris-light px-3 py-2 text-sm">
              <span className="font-bold text-nuit">⭐ {pro.googleRating}</span>
              <span className="text-gris">({pro.googleRatingCount} avis Google)</span>
              {pro.googleRatingSyncedAt && (
                <span className="ml-auto text-[11px] text-gris">
                  Actualisé le {new Date(pro.googleRatingSyncedAt).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>
          )}
        </div>

        {socialMessage && <p className="mb-4 text-sm">{socialMessage}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={savingSocial}
            className="rounded-sm bg-golfe-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {savingSocial ? "Enregistrement..." : "Enregistrer"}
          </button>
          <button
            type="button"
            onClick={handleSyncGoogleRating}
            disabled={syncingGoogle || !googlePlaceId.trim()}
            className="rounded-sm border border-gris-light px-5 py-2.5 text-sm font-semibold text-nuit disabled:opacity-50"
          >
            {syncingGoogle ? "Synchronisation..." : "🔄 Actualiser la note Google"}
          </button>
        </div>
      </form>

      <div className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-1 font-heading text-base font-bold text-nuit">🏖️ Vacances / Fermeture exceptionnelle</h3>
        <p className="mb-4 text-xs text-gris">
          Fermez votre boutique aux clients en un clic, sans toucher à vos horaires habituels ci-dessous — ils
          seront simplement réappliqués automatiquement dès la réouverture.
        </p>

        {isManuallyClosed ? (
          <div className="rounded-sm bg-orange-50 p-4">
            <p className="text-sm font-bold text-corail">
              {closureReason === "VACATION" ? "🏖️ Boutique en vacances" : "🚫 Boutique fermée exceptionnellement"}
            </p>
            {closureUntil && (
              <p className="mt-1 text-xs text-gris">Retour prévu le {new Date(closureUntil).toLocaleDateString("fr-FR")}</p>
            )}
            {closureNote && <p className="mt-1 text-xs text-gris">"{closureNote}"</p>}
            <button
              onClick={() => handleToggleClosure(false)}
              disabled={savingClosure}
              className="mt-3 rounded-sm bg-golfe-green px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {savingClosure ? "..." : "Réouvrir la boutique"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-sm text-nuit">
                <input
                  type="radio"
                  name="closureReason"
                  checked={closureReason === "VACATION"}
                  onChange={() => setClosureReason("VACATION")}
                />
                En vacances
              </label>
              <label className="flex items-center gap-1.5 text-sm text-nuit">
                <input
                  type="radio"
                  name="closureReason"
                  checked={closureReason === "CLOSED"}
                  onChange={() => setClosureReason("CLOSED")}
                />
                Fermé exceptionnellement
              </label>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gris">Retour prévu le (optionnel)</label>
              <input
                type="date"
                value={closureUntil}
                onChange={(e) => setClosureUntil(e.target.value)}
                className="rounded-sm border border-gris-light px-2 py-1 text-sm"
              />
            </div>
            <input
              type="text"
              placeholder="Message affiché aux clients (optionnel)"
              value={closureNote}
              onChange={(e) => setClosureNote(e.target.value)}
              maxLength={200}
              className="rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
            <button
              onClick={() => handleToggleClosure(true)}
              disabled={savingClosure}
              className="self-start rounded-sm bg-corail px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {savingClosure ? "..." : "Fermer la boutique"}
            </button>
          </div>
        )}

        {closureMessage && <p className="mt-3 text-xs text-gris">{closureMessage}</p>}
      </div>

      <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-4 font-heading text-base font-bold text-nuit">🕐 Horaires d'ouverture</h3>
        <div className="flex flex-col gap-2">
          {hours.map((day) => (
            <div key={day.dayOfWeek} className="flex items-center gap-4 border-b border-gris-light py-2 last:border-0">
              <span className="w-24 text-sm font-medium text-nuit">{DAY_LABELS[day.dayOfWeek]}</span>
              <label className="flex items-center gap-1.5 text-xs text-gris">
                <input
                  type="checkbox"
                  checked={!day.isClosed}
                  onChange={(e) => updateHour(day.dayOfWeek, "isClosed", !e.target.checked)}
                />
                Ouvert
              </label>
              {!day.isClosed && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={day.openTime}
                    onChange={(e) => updateHour(day.dayOfWeek, "openTime", e.target.value)}
                    className="rounded-sm border border-gris-light px-2 py-1 text-sm"
                  />
                  <span className="text-sm text-gris">à</span>
                  <input
                    type="time"
                    value={day.closeTime}
                    onChange={(e) => updateHour(day.dayOfWeek, "closeTime", e.target.value)}
                    className="rounded-sm border border-gris-light px-2 py-1 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveHours}
          disabled={savingHours}
          className="mt-5 rounded-sm bg-golfe-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {savingHours ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gris">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm disabled:bg-gris-light disabled:text-gris"
      />
    </div>
  );
}
