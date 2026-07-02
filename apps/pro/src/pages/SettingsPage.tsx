import React, { useEffect, useState } from "react";
import type { Pro, OpeningHours } from "@golfeexpress/types";
import {
  fetchMyShopProfile,
  updateMyShopProfile,
  fetchMyOpeningHours,
  updateMyOpeningHours,
} from "@/services/shopProfileApi";
import { ImageUploadField } from "@/components/ImageUploadField";
import { uploadProAsset, withCacheBust } from "@/services/uploadsApi";
import { getCategoryEmoji } from "@/services/categoryVisuals";

const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export function SettingsPage() {
  const [pro, setPro] = useState<Pro | null>(null);
  const [hours, setHours] = useState<OpeningHours[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  // Champs contrôlés du formulaire "Informations générales"
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function load() {
    setStatus("loading");
    try {
      const [shopProfile, openingHours] = await Promise.all([fetchMyShopProfile(), fetchMyOpeningHours()]);
      setPro(shopProfile);
      setBusinessName(shopProfile.businessName);
      setDescription(shopProfile.description ?? "");
      setPhone(shopProfile.phone);
      setEmailContact(shopProfile.emailContact);

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

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setSaveMessage(null);
    try {
      const updated = await updateMyShopProfile({ businessName, description, phone, emailContact });
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
        </div>
        <button
          type="submit"
          disabled={savingProfile}
          className="mt-5 rounded-sm bg-golfe-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {savingProfile ? "Enregistrement..." : "Enregistrer les informations"}
        </button>
      </form>

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
