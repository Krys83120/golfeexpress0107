"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { PublicPro } from "@/lib/publicApi";
import { distanceKm, CATEGORY_LABELS } from "@/lib/publicApi";

interface CommercantsBrowserProps {
  pros: PublicPro[];
}

type GeoStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";

export function CommercantsBrowser({ pros }: CommercantsBrowserProps) {
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  function requestLocation() {
    if (!navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { timeout: 8000 }
    );
  }

  const categories = useMemo(() => Array.from(new Set(pros.map((p) => p.category))), [pros]);

  const enrichedPros = useMemo(() => {
    return pros
      .map((pro) => {
        const addr = pro.addresses?.[0];
        const distance = userLocation && addr ? distanceKm(userLocation.lat, userLocation.lng, addr.lat, addr.lng) : null;
        return { ...pro, distance };
      })
      .filter((p) => categoryFilter === "ALL" || p.category === categoryFilter)
      .filter((p) => !search || p.businessName.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        return 0;
      });
  }, [pros, userLocation, categoryFilter, search]);

  return (
    <div>
      {/* Bandeau géolocalisation */}
      {geoStatus === "idle" && (
        <div className="mb-8 flex flex-col items-center gap-3 rounded-2xl bg-nuit p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-heading font-bold text-white">📍 Voir les commerçants les plus proches de vous ?</p>
            <p className="mt-1 text-sm text-white/70">Activez votre position pour trier automatiquement par distance.</p>
          </div>
          <button
            onClick={requestLocation}
            className="flex-shrink-0 rounded-full bg-golfe-green px-6 py-2.5 text-sm font-bold text-nuit transition hover:bg-white"
          >
            Activer ma position
          </button>
        </div>
      )}
      {geoStatus === "loading" && (
        <p className="mb-8 text-center text-sm text-gris">📍 Recherche de votre position…</p>
      )}
      {geoStatus === "denied" && (
        <div className="mb-8 rounded-2xl bg-orange-50 p-5 text-sm text-corail">
          <p className="mb-2 font-semibold">📍 Localisation bloquée pour ce site.</p>
          <p className="mb-1">Pour l'activer :</p>
          <ul className="ml-4 list-disc space-y-0.5">
            <li>Cliquez sur le cadenas (ou l'icône "i") à gauche de l'adresse du site dans votre navigateur</li>
            <li>Repérez "Localisation" et passez-le sur "Autoriser"</li>
            <li>Rechargez cette page</li>
          </ul>
          <button onClick={requestLocation} className="mt-3 font-semibold underline">
            Réessayer maintenant
          </button>
        </div>
      )}
      {geoStatus === "unsupported" && (
        <p className="mb-8 text-center text-sm text-gris">Votre navigateur ne permet pas la géolocalisation.</p>
      )}
      {geoStatus === "granted" && (
        <p className="mb-8 text-center text-sm text-golfe-green">📍 Commerçants triés par proximité avec vous</p>
      )}

      {/* Filtres */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un commerçant…"
          className="rounded-full border border-gris-light px-5 py-2.5 text-sm sm:w-72"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter("ALL")}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              categoryFilter === "ALL" ? "bg-nuit text-white" : "bg-gris-light text-nuit"
            }`}
          >
            Tous
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                categoryFilter === cat ? "bg-nuit text-white" : "bg-gris-light text-nuit"
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grille commerçants */}
      {enrichedPros.length === 0 ? (
        <p className="py-16 text-center text-gris">Aucun commerçant ne correspond à cette recherche.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {enrichedPros.map((pro) => (
            <Link
              key={pro.id}
              href={`/commercants/${pro.id}`}
              className="group overflow-hidden rounded-3xl border border-gris-light bg-white transition hover:shadow-lg"
            >
              <div className="h-36 w-full overflow-hidden bg-sable">
                {pro.coverImage ? (
                  <img
                    src={pro.coverImage}
                    alt={pro.businessName}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">
                    {CATEGORY_LABELS[pro.category]?.split(" ")[0] ?? "🏪"}
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-base font-bold text-nuit">{pro.businessName}</h3>
                  {pro.distance !== null && (
                    <span className="flex-shrink-0 rounded-full bg-golfe-green/10 px-2.5 py-1 text-xs font-bold text-golfe-green">
                      {pro.distance.toFixed(1)} km
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gris">{CATEGORY_LABELS[pro.category] ?? pro.category}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-gris">
                  {pro.rating && pro.ratingCount > 0 && (
                    <span>⭐ {Number(pro.rating).toFixed(1)} ({pro.ratingCount})</span>
                  )}
                  {pro.addresses?.[0]?.city && <span>📍 {pro.addresses[0].city}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
