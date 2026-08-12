"use client";

import React, { useState } from "react";

const PORTAL_LINKS = [
  { label: "Espace Client", href: "https://deploy-client-gamma.vercel.app", hint: "Commander" },
  { label: "Espace Commerçant", href: "https://golfeexpress0107-pro.vercel.app", hint: "Gérer ma boutique" },
  { label: "Espace Livreur", href: "https://deploy-livreur.vercel.app", hint: "Livrer" },
  { label: "Espace Admin", href: "https://golfeexpress0107-admin.vercel.app", hint: "Équipe GolfeExpress" },
];

const NAV_LINKS = [
  { label: "Comment ça marche", href: "#comment-ca-marche" },
  { label: "Nos commerçants", href: "/commercants" },
  { label: "Devenir livreur", href: "#devenir-livreur" },
  { label: "Devenir partenaire", href: "#devenir-partenaire" },
];

export function Nav() {
  const [portalsOpen, setPortalsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function closeAll() {
    setPortalsOpen(false);
    setMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-nuit/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2" onClick={closeAll}>
          <span className="text-2xl">🦎</span>
          <span className="font-heading text-base font-extrabold text-white sm:text-lg">GolfeExpress</span>
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-white/80 transition hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Portails (Se connecter) — toujours visible, même sur mobile */}
          <div className="relative">
            <button
              onClick={() => {
                setPortalsOpen((v) => !v);
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-golfe-green px-4 py-2 text-xs font-bold text-nuit transition hover:bg-golfe-green-dark hover:text-white sm:px-5 sm:py-2.5 sm:text-sm"
              aria-expanded={portalsOpen}
              aria-haspopup="true"
            >
              Se connecter
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`transition ${portalsOpen ? "rotate-180" : ""}`}>
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {portalsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPortalsOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-xl">
                  {PORTAL_LINKS.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="block border-b border-gris-light px-5 py-3.5 last:border-0 hover:bg-sable"
                      onClick={closeAll}
                    >
                      <p className="text-sm font-bold text-nuit">{link.label}</p>
                      <p className="text-xs text-gris">{link.hint}</p>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Bouton hamburger — visible uniquement en dessous du breakpoint lg où la nav horizontale disparaît */}
          <button
            onClick={() => {
              setMobileMenuOpen((v) => !v);
              setPortalsOpen(false);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white lg:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <path d="M0 1H16M0 6H16M0 11H16" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {mobileMenuOpen && (
        <nav className="border-t border-white/10 bg-nuit px-4 py-3 lg:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={closeAll}
              className="block rounded-lg px-3 py-3 text-sm font-medium text-white/85 hover:bg-white/5"
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
