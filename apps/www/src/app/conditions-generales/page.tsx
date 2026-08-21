import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation et de Vente",
  description:
    "Conditions Générales d'Utilisation et de Vente de Do You Geckoo — règles applicables aux clients, aux commerçants partenaires et aux livreurs partenaires.",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "19 août 2026";

interface TocItem {
  id: string;
  label: string;
}

const TOC: TocItem[] = [
  { id: "objet", label: "1. Objet et champ d'application" },
  { id: "definitions", label: "2. Définitions" },
  { id: "compte", label: "3. Accès aux services et création de compte" },
  { id: "role", label: "4. Rôle de Do You Geckoo" },
  { id: "clients", label: "5. Dispositions applicables aux Clients" },
  { id: "commercants", label: "6. Dispositions applicables aux Commerçants partenaires" },
  { id: "livreurs", label: "7. Dispositions applicables aux Livreurs partenaires" },
  { id: "responsabilite", label: "8. Responsabilité et limitations" },
  { id: "propriete", label: "9. Propriété intellectuelle" },
  { id: "donnees", label: "10. Données personnelles" },
  { id: "modification", label: "11. Modification des CGU" },
  { id: "resiliation", label: "12. Suspension et résiliation de compte" },
  { id: "droit", label: "13. Droit applicable et litiges" },
  { id: "contact", label: "14. Contact" },
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

export default function CguPage() {
  return (
    <>
      <Nav />
      <main className="bg-white">
        <div className="border-b border-gris-light bg-sable py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-golfe-green">Cadre légal</p>
            <h1 className="mt-3 font-heading text-3xl font-extrabold text-nuit sm:text-4xl">
              Conditions Générales d'Utilisation et de Vente
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-gris">
              Ces Conditions Générales encadrent l'utilisation de la plateforme Do You Geckoo (site et applications
              Client, Commerçant et Livreur) par tous les utilisateurs : Clients, Commerçants partenaires et
              Livreurs partenaires. En créant un compte ou en utilisant nos services, vous acceptez sans réserve les
              présentes conditions.
            </p>
            <p className="mt-3 text-xs text-gris">Dernière mise à jour : {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          {/* Sommaire */}
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
            <Section id="objet" title="1. Objet et champ d'application">
              <p>
                Do You Geckoo (« la Plateforme », « nous ») exploite un service de mise en relation entre des
                commerçants locaux du Golfe de Saint-Tropez (« Commerçants »), des livreurs indépendants
                (« Livreurs ») et des particuliers souhaitant commander et se faire livrer des produits
                (« Clients »), accessible via le site doyougeckoo.fr et les applications mobiles/web Commander, Pro
                et Livreur (ensemble, « les Services »).
              </p>
              <p>
                Les présentes CGU s'appliquent à toute personne créant un compte ou utilisant les Services, quel que
                soit son profil. Les sections 5, 6 et 7 ci-dessous contiennent des dispositions spécifiques
                respectivement aux Clients, aux Commerçants et aux Livreurs, qui s'ajoutent au socle commun des
                sections 1 à 4 et 8 à 14.
              </p>
            </Section>

            <Section id="definitions" title="2. Définitions">
              <p><strong className="text-nuit">Plateforme :</strong> l'ensemble des sites web et applications édités par Do You Geckoo.</p>
              <p><strong className="text-nuit">Client :</strong> toute personne physique passant commande via la Plateforme.</p>
              <p><strong className="text-nuit">Commerçant (ou « Pro ») :</strong> tout professionnel (restaurant, commerce alimentaire ou non alimentaire) référencé sur la Plateforme et vendant ses produits aux Clients.</p>
              <p><strong className="text-nuit">Livreur :</strong> tout travailleur indépendant assurant, pour son propre compte, la livraison des Commandes entre le Commerçant et le Client via la Plateforme.</p>
              <p><strong className="text-nuit">Commande :</strong> toute transaction passée par un Client auprès d'un Commerçant via la Plateforme, incluant le cas échéant sa livraison.</p>
            </Section>

            <Section id="compte" title="3. Accès aux services et création de compte">
              <p>
                L'utilisation des Services nécessite la création d'un compte, associé à une adresse email et un
                numéro de téléphone valides. Chaque utilisateur s'engage à fournir des informations exactes et à les
                maintenir à jour, et à ne créer qu'un seul compte par profil (Client, Commerçant ou Livreur).
              </p>
              <p>
                L'accès aux fonctionnalités réservées aux Commerçants et aux Livreurs est conditionné à la
                validation de leur dossier par l'équipe Do You Geckoo (voir sections 6 et 7).
              </p>
            </Section>

            <Section id="role" title="4. Rôle de Do You Geckoo">
              <p>
                Do You Geckoo agit en qualité d'intermédiaire technique. Elle met à disposition une place de marché
                permettant aux Commerçants de proposer leurs produits, aux Clients de les commander et de se les
                faire livrer, et aux Livreurs d'assurer cette livraison de façon indépendante.
              </p>
              <p>
                Le contrat de vente des produits commandés se forme directement entre le Client et le Commerçant.
                Do You Geckoo n'est pas partie à ce contrat de vente : elle n'est ni le vendeur des produits, ni
                l'employeur des Livreurs, qui exercent leur activité en toute indépendance. Do You Geckoo agit
                toutefois comme mandataire d'encaissement pour le compte des Commerçants et organise la mise en
                relation logistique avec un Livreur disponible.
              </p>
            </Section>

            <Section id="clients" title="5. Dispositions applicables aux Clients">
              <SubHeading>Commande et formation du contrat</SubHeading>
              <p>
                Chaque Commande passée sur la Plateforme forme un contrat de vente directement entre le Client et le
                Commerçant concerné. La Commande est réputée acceptée par le Commerçant lorsqu'il la confirme via
                son espace Pro ; elle peut être refusée en cas d'indisponibilité d'un produit ou de fermeture
                imprévue.
              </p>

              <SubHeading>Prix et paiement</SubHeading>
              <p>
                Les prix affichés sont exprimés en euros, toutes taxes comprises. Ils incluent, le cas échéant, des
                frais de livraison et des frais de service, détaillés avant validation de la Commande. Le paiement
                s'effectue en ligne, au moment de la Commande, par carte bancaire via notre prestataire de paiement
                sécurisé (Stripe) ; Do You Geckoo ne stocke à aucun moment les données bancaires du Client.
              </p>

              <SubHeading>Livraison</SubHeading>
              <p>
                Les délais de livraison affichés sont estimatifs et dépendent de la disponibilité du Commerçant et
                des Livreurs, ainsi que des conditions de circulation. Le suivi de la Commande est accessible en
                temps réel dans l'application. La remise de la Commande au Client est confirmée au moyen d'un code
                de vérification communiqué au Livreur.
              </p>

              <SubHeading>Droit de rétractation</SubHeading>
              <p>
                Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne s'applique
                pas aux contrats de fourniture de biens susceptibles de se détériorer ou de se périmer rapidement
                (denrées alimentaires notamment). Pour les autres produits, toute question relative à une
                réclamation ou un remboursement doit être adressée à notre support, qui statue au cas par cas en
                lien avec le Commerçant concerné.
              </p>

              <SubHeading>Annulation</SubHeading>
              <p>
                Une Commande peut être annulée tant qu'elle n'a pas été prise en charge en préparation par le
                Commerçant. Passé ce stade, l'annulation n'est plus garantie et fait l'objet d'un traitement au cas
                par cas par le support.
              </p>

              <SubHeading>Avis et notation</SubHeading>
              <p>
                À l'issue d'une Commande livrée, le Client peut librement laisser un avis et une note, de façon
                totalement indépendante, pour : le Commerçant, le Livreur, la Plateforme Do You Geckoo, et chaque
                produit acheté individuellement (dont la note s'affiche sur la fiche de ce produit). Le Client n'est
                jamais tenu de tout évaluer : il choisit ce qu'il souhaite noter et commenter. Les avis peuvent être
                modérés ou masqués par Do You Geckoo en cas de contenu abusif, diffamatoire ou manifestement
                mensonger.
              </p>

              <SubHeading>Fidélité et parrainage</SubHeading>
              <p>
                Le Client cumule des points de fidélité au fil de ses Commandes et dispose d'un code de parrainage
                personnel, dans les conditions présentées dans l'application. Do You Geckoo se réserve le droit de
                faire évoluer les modalités de ces programmes, sans effet rétroactif sur les avantages déjà acquis.
              </p>
            </Section>

            <Section id="commercants" title="6. Dispositions applicables aux Commerçants partenaires">
              <SubHeading>Éligibilité et validation</SubHeading>
              <p>
                L'inscription en tant que Commerçant nécessite un numéro SIRET valide et la fourniture d'un extrait
                Kbis à jour (moins de 3 mois), ainsi que des informations légales exactes (raison sociale, forme
                juridique, coordonnées). Le compte est activé après validation manuelle par l'équipe Do You Geckoo,
                qui peut refuser ou suspendre un dossier incomplet ou non conforme.
              </p>

              <SubHeading>Gestion de la boutique</SubHeading>
              <p>
                Le Commerçant est seul responsable du contenu de sa fiche (photos, descriptions, prix, catégories,
                options de produits) et de l'exactitude de la disponibilité réelle de ses produits. Il définit ses
                horaires d'ouverture et peut signaler une fermeture manuelle temporaire (congés, imprévu), avec un
                motif affiché aux Clients.
              </p>

              <SubHeading>Commission et packs partenaires</SubHeading>
              <p>
                Do You Geckoo perçoit une commission sur chaque Commande, dont le taux dépend du pack partenaire
                souscrit (voir la page{" "}
                <Link href="/devenir-partenaire" className="text-golfe-green underline">Devenir partenaire</Link>{" "}
                pour le détail et les tarifs à jour). Les packs payants sont facturés mensuellement et peuvent être
                modifiés ou résiliés à tout moment depuis l'espace Pro, sans engagement de durée. Les sommes dues au
                Commerçant au titre des Commandes sont reversées via Stripe Connect, déduction faite de la
                commission applicable.
              </p>

              <SubHeading>Obligations du Commerçant</SubHeading>
              <p>
                Le Commerçant demeure seul responsable de la conformité, de la qualité, de l'hygiène et de la
                sécurité des produits qu'il vend, ainsi que du respect de la réglementation applicable à son
                activité (notamment en matière d'affichage des prix, d'allergènes et d'hygiène alimentaire le cas
                échéant). Do You Geckoo n'intervient pas dans la préparation des produits.
              </p>
            </Section>

            <Section id="livreurs" title="7. Dispositions applicables aux Livreurs partenaires">
              <SubHeading>Statut d'indépendant</SubHeading>
              <p>
                Le Livreur exerce son activité de manière indépendante (auto-entrepreneur, société ou autre statut
                autorisé). Il n'existe aucun lien de subordination avec Do You Geckoo, qui n'est en aucun cas son
                employeur : le Livreur choisit librement ses horaires de connexion, les zones sur lesquelles il
                souhaite être disponible, et peut refuser une course proposée sans avoir à se justifier.
              </p>

              <SubHeading>Dossier obligatoire (KYC)</SubHeading>
              <p>
                L'activation d'un compte Livreur est conditionnée à la fourniture d'un dossier complet, comprenant :
                une pièce d'identité recto/verso, un selfie de vérification (usage strictement interne, jamais
                communiqué), une <strong className="text-nuit">photo de profil obligatoire</strong> — c'est celle-ci,
                et uniquement celle-ci, qui est affichée aux Clients pendant le suivi de leur livraison — les
                informations relatives au véhicule utilisé et, le cas échéant, au permis de conduire, une attestation
                d'assurance responsabilité civile professionnelle, le statut professionnel déclaré, et un IBAN pour
                le versement des gains. Aucun compte Livreur ne peut être validé par l'équipe Do You Geckoo tant que
                la photo de profil n'a pas été fournie.
              </p>

              <SubHeading>Validation</SubHeading>
              <p>
                Chaque dossier est examiné manuellement par l'équipe Do You Geckoo, généralement sous 24 à 48
                heures. En cas de refus, un motif est communiqué par email au Livreur, qui peut compléter son
                dossier et soumettre une nouvelle demande.
              </p>

              <SubHeading>Rémunération</SubHeading>
              <p>
                Le Livreur est rémunéré à la course, selon un montant affiché avant acceptation de chaque livraison.
                Ses gains sont visibles en temps réel dans l'application et peuvent être retirés vers son compte
                bancaire, via Stripe Connect, selon les modalités présentées dans l'espace Livreur.
              </p>

              <SubHeading>Obligations du Livreur</SubHeading>
              <p>
                Le Livreur s'engage à respecter le Code de la route, à adopter un comportement courtois et
                professionnel envers les Commerçants et les Clients, à assurer son véhicule conformément à la
                réglementation en vigueur, à remettre chaque Commande contre présentation du code de vérification
                communiqué par le Client, et à signaler sans délai tout incident survenu pendant une course.
              </p>

              <SubHeading>Responsabilité</SubHeading>
              <p>
                Le Livreur demeure seul responsable de son véhicule, de son assurance, ainsi que du respect des
                obligations légales, sociales et fiscales attachées à son statut d'indépendant.
              </p>
            </Section>

            <Section id="responsabilite" title="8. Responsabilité et limitations">
              <p>
                Do You Geckoo met en œuvre des moyens raisonnables pour assurer la disponibilité et la fiabilité de
                ses Services, sans garantir une disponibilité ininterrompue ni exempte d'erreurs. Do You Geckoo ne
                saurait être tenue responsable des dommages indirects, ni des faits qui seraient exclusivement
                imputables à un Commerçant ou à un Livreur, tiers indépendants dont Do You Geckoo n'est ni
                l'employeur ni le mandataire général.
              </p>
            </Section>

            <Section id="propriete" title="9. Propriété intellectuelle">
              <p>
                La marque, le logo, les mascottes et l'ensemble des éléments graphiques et textuels de la Plateforme
                sont la propriété de Do You Geckoo ou de ses partenaires et sont protégés par le droit de la
                propriété intellectuelle. Toute reproduction non autorisée est interdite.
              </p>
            </Section>

            <Section id="donnees" title="10. Données personnelles">
              <p>
                Le traitement des données personnelles collectées via la Plateforme est décrit en détail dans notre{" "}
                <Link href="/confidentialite" className="text-golfe-green underline">Politique de Confidentialité</Link>,
                qui fait partie intégrante des présentes CGU.
              </p>
            </Section>

            <Section id="modification" title="11. Modification des CGU">
              <p>
                Do You Geckoo peut faire évoluer les présentes CGU, notamment pour tenir compte des évolutions du
                Service ou de la réglementation. Les utilisateurs seront informés de toute modification substantielle
                par email ou notification dans l'application avant son entrée en vigueur. La poursuite de
                l'utilisation des Services après cette date vaut acceptation des CGU modifiées.
              </p>
            </Section>

            <Section id="resiliation" title="12. Suspension et résiliation de compte">
              <p>
                Do You Geckoo se réserve le droit de suspendre ou de résilier, temporairement ou définitivement, tout
                compte en cas de manquement grave aux présentes CGU, de fraude avérée ou suspectée, ou de
                comportement mettant en danger la sécurité d'un autre utilisateur. Chaque utilisateur peut à tout
                moment demander la clôture de son compte via le support.
              </p>
            </Section>

            <Section id="droit" title="13. Droit applicable et litiges">
              <p>
                Les présentes CGU sont soumises au droit français. En cas de litige, et conformément aux dispositions
                du Code de la consommation, tout Client peut recourir gratuitement à un médiateur de la consommation
                en vue de la résolution amiable du litige. À défaut de résolution amiable, les tribunaux français
                compétents seront seuls saisis.
              </p>
            </Section>

            <Section id="contact" title="14. Contact">
              <p>
                Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l'adresse{" "}
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
