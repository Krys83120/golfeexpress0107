import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Politique de Confidentialité",
  description:
    "Politique de Confidentialité de Do You Geckoo — quelles données sont collectées, pourquoi, et comment exercer vos droits (RGPD).",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "19 août 2026";

interface TocItem {
  id: string;
  label: string;
}

const TOC: TocItem[] = [
  { id: "preambule", label: "1. Préambule" },
  { id: "donnees-collectees", label: "2. Données collectées" },
  { id: "finalites", label: "3. Pourquoi nous les utilisons" },
  { id: "base-legale", label: "4. Base légale du traitement" },
  { id: "destinataires", label: "5. Qui a accès à vos données" },
  { id: "conservation", label: "6. Durée de conservation" },
  { id: "securite", label: "7. Sécurité des données" },
  { id: "droits", label: "8. Vos droits" },
  { id: "cookies", label: "9. Cookies et traceurs" },
  { id: "mineurs", label: "10. Mineurs" },
  { id: "modification", label: "11. Modifications de cette politique" },
  { id: "contact", label: "12. Contact" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-gris-light pt-8">
      <h2 className="font-heading text-xl font-extrabold text-nuit sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-gris">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="!mt-8 font-heading text-base font-bold text-nuit">{children}</h3>;
}

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="bg-white">
        <div className="border-b border-gris-light bg-sable py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-golfe-green">Cadre légal</p>
            <h1 className="mt-3 font-heading text-3xl font-extrabold text-nuit sm:text-4xl">Politique de Confidentialité</h1>
            <p className="mt-4 max-w-2xl text-sm text-gris">
              Cette politique explique quelles données personnelles Do You Geckoo collecte, pourquoi, avec qui elles
              sont partagées, et comment vous pouvez exercer vos droits, conformément au Règlement Général sur la
              Protection des Données (RGPD).
            </p>
            <p className="mt-3 text-xs text-gris">Dernière mise à jour : {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <nav aria-label="Sommaire" className="mb-12 rounded-2xl bg-gris-light p-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gris">Sommaire</p>
            <ol className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {TOC.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-nuit underline decoration-gris-light underline-offset-2 hover:text-golfe-green">
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-10">
            <Section id="preambule" title="1. Préambule">
              <p>
                Do You Geckoo est responsable du traitement des données personnelles collectées via son site et ses
                applications (Commander, Pro, Livreur). Nous nous engageons à traiter ces données dans le respect du
                RGPD et de la loi Informatique et Libertés.
              </p>
            </Section>

            <Section id="donnees-collectees" title="2. Données collectées">
              <SubHeading>Pour tous les utilisateurs</SubHeading>
              <p>Nom, prénom, adresse email, numéro de téléphone, mot de passe (stocké sous forme chiffrée/hachée), et photo de profil si vous choisissez d'en ajouter une.</p>

              <SubHeading>Si vous êtes Client</SubHeading>
              <p>
                Adresses de livraison, historique de commandes, avis et notes laissés (Commerçant, Livreur,
                Plateforme, Produits), points de fidélité et code de parrainage. Vos moyens de paiement (numéro de
                carte bancaire) sont saisis et conservés directement par notre prestataire de paiement Stripe — Do
                You Geckoo n'y a jamais accès et ne les stocke jamais sur ses propres serveurs.
              </p>

              <SubHeading>Si vous êtes Commerçant</SubHeading>
              <p>
                Informations légales de votre entreprise (raison sociale, SIRET, forme juridique, extrait Kbis),
                coordonnées bancaires pour les reversements (gérées via Stripe Connect), photos de votre boutique et
                de vos produits, données de facturation liées à votre pack partenaire.
              </p>

              <SubHeading>Si vous êtes Livreur</SubHeading>
              <p>
                État civil et adresse, pièce d'identité (recto/verso), selfie de vérification, photo de profil
                publique, informations sur votre véhicule et votre assurance, statut professionnel déclaré, IBAN, et
                votre position géographique en temps réel — uniquement pendant que vous êtes en ligne et le temps
                d'une livraison active. Votre position n'est jamais suivie lorsque vous êtes hors ligne.
              </p>
            </Section>

            <Section id="finalites" title="3. Pourquoi nous les utilisons">
              <p>
                Ces données sont utilisées pour : exécuter le contrat qui vous lie à Do You Geckoo (gestion des
                commandes, des livraisons et des paiements), vérifier votre identité et prévenir la fraude
                (notamment pour l'activation des comptes Commerçant et Livreur), assurer le support client, améliorer
                nos Services, et respecter nos obligations légales et comptables.
              </p>
            </Section>

            <Section id="base-legale" title="4. Base légale du traitement">
              <p>
                Selon les cas, le traitement de vos données repose sur : l'exécution du contrat qui vous lie à Do You
                Geckoo (ex. : traitement de vos commandes), une obligation légale (ex. : conservation de documents
                comptables ou de vérification d'identité), notre intérêt légitime (ex. : prévention de la fraude,
                sécurité de la Plateforme), ou votre consentement (ex. : communications marketing optionnelles, que
                vous pouvez retirer à tout moment).
              </p>
            </Section>

            <Section id="destinataires" title="5. Qui a accès à vos données">
              <p>
                Le Commerçant a accès aux informations nécessaires à la préparation de votre commande. Le Livreur a
                accès à l'adresse de livraison et au contact du Client, uniquement pour la durée de la course en
                cours. Vos données sont également traitées par nos sous-traitants techniques, notamment notre
                hébergeur et base de données (Supabase) et notre prestataire de paiement (Stripe), dans la stricte
                mesure nécessaire au fonctionnement du Service. Vos données ne sont jamais vendues à des tiers à des
                fins commerciales.
              </p>
            </Section>

            <Section id="conservation" title="6. Durée de conservation">
              <p>
                Vos données sont conservées le temps de votre relation avec Do You Geckoo, puis archivées pour la
                durée requise par nos obligations légales (notamment comptables, généralement 5 à 10 ans pour les
                documents de facturation). Les documents d'identité et de vérification (KYC) des Livreurs et
                Commerçants sont conservés dans un espace de stockage privé, séparé des données publiques, pour la
                durée nécessaire à la relation contractuelle et aux obligations légales applicables.
              </p>
            </Section>

            <Section id="securite" title="7. Sécurité des données">
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles adaptées pour protéger vos
                données : chiffrement des mots de passe, accès restreint aux documents sensibles (pièces d'identité,
                selfies de vérification) qui sont hébergés dans un espace distinct et non public des photos de
                profil, et contrôle des accès internes à notre équipe.
              </p>
            </Section>

            <Section id="droits" title="8. Vos droits">
              <p>
                Conformément aux articles 15 à 22 du RGPD, vous disposez d'un droit d'accès, de rectification,
                d'effacement, de limitation, d'opposition et de portabilité de vos données. Vous pouvez exercer ces
                droits en écrivant à{" "}
                <a href="mailto:contact@doyougeckoo.fr" className="text-golfe-green underline">contact@doyougeckoo.fr</a>.
                Vous disposez également du droit d'introduire une réclamation auprès de la Commission Nationale de
                l'Informatique et des Libertés (CNIL) si vous estimez que vos droits ne sont pas respectés.
              </p>
            </Section>

            <Section id="cookies" title="9. Cookies et traceurs">
              <p>
                Lors de votre première visite, un bandeau vous permet de choisir librement les cookies que vous
                acceptez. Nous distinguons deux catégories :
              </p>
              <p>
                <strong className="text-nuit">Cookies essentiels</strong> — strictement nécessaires au fonctionnement
                du site (navigation, mémorisation de votre choix de cookies). Ils ne sont pas soumis à votre
                consentement et ne peuvent pas être désactivés.
              </p>
              <p>
                <strong className="text-nuit">Cookies de mesure d'audience</strong> — déposés uniquement si vous les
                acceptez explicitement, pour nous aider à comprendre l'usage du site de façon anonymisée. Nous
                n'utilisons aucun cookie publicitaire ni de traceur tiers à des fins commerciales.
              </p>
              <p>
                Vous pouvez à tout moment revenir sur votre choix via le lien « Gérer les cookies », disponible en
                bas de chaque page du site. Votre choix est mémorisé pendant 6 mois, au-delà desquels il vous sera
                à nouveau demandé, conformément aux recommandations de la CNIL.
              </p>
            </Section>

            <Section id="mineurs" title="10. Mineurs">
              <p>
                Nos Services ne sont pas destinés aux personnes mineures non accompagnées d'un représentant légal.
                Si vous pensez qu'un mineur nous a communiqué des données sans autorisation, contactez-nous afin que
                nous puissions procéder à leur suppression.
              </p>
            </Section>

            <Section id="modification" title="11. Modifications de cette politique">
              <p>
                Cette politique peut être mise à jour pour refléter l'évolution de nos Services ou de la
                réglementation. Toute modification substantielle vous sera notifiée par email ou dans l'application.
              </p>
            </Section>

            <Section id="contact" title="12. Contact">
              <p>
                Pour toute question relative à cette Politique de Confidentialité, contactez-nous à{" "}
                <a href="mailto:contact@doyougeckoo.fr" className="text-golfe-green underline">contact@doyougeckoo.fr</a>.
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
