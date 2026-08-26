import React from "react";
import { X, Plus, Pencil, Copy, Mail, Ban, Zap } from "lucide-react";

interface ProductTutorialModalProps {
  onClose: () => void;
}

/**
 * Tutoriel "Comment ajouter vos produits ?" -- demandé par un Pro venant de
 * s'inscrire pour qui la création de produits (et surtout la logique
 * "groupe d'options") n'était pas évidente. Contenu volontairement collé au
 * plus près des vrais libellés/boutons de ProductFormModal.tsx et
 * MenuPage.tsx (pas une description générique) pour qu'un Pro puisse suivre
 * pas à pas sans jamais être surpris par un écran différent de ce qui est
 * décrit ici. Se termine par l'offre de prise en charge par notre équipe
 * dev, avec un lien mailto vers contact@doyougeckoo.fr (adresse réelle,
 * redirigée côté OVH -- voir shared.ts ADMIN_EMAIL).
 */
export function ProductTutorialModal({ onClose }: ProductTutorialModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-heading text-xl font-bold text-nuit">Comment ajouter vos produits ?</h2>
            <p className="mt-1 text-sm text-gris">
              Le guide pas à pas pour créer vos produits, puis leurs options (tailles, suppléments, sauces...).
              Environ 3 minutes de lecture.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-gris hover:bg-gris-light">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* Étape 1 */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-golfe-green text-xs font-bold text-nuit">
                1
              </span>
              <h3 className="font-heading text-sm font-bold text-nuit">Ouvrez "Produits" dans le menu de gauche</h3>
            </div>
            <p className="ml-8 text-sm leading-relaxed text-gris">
              C'est là que se trouve toute votre carte : vos produits déjà en ligne, triés par catégorie, et le
              bouton pour en ajouter de nouveaux.
            </p>
          </section>

          {/* Étape 2 */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-golfe-green text-xs font-bold text-nuit">
                2
              </span>
              <h3 className="font-heading text-sm font-bold text-nuit">Créez le produit de base</h3>
            </div>
            <div className="ml-8">
              <p className="mb-2 text-sm leading-relaxed text-gris">
                Cliquez sur{" "}
                <span className="inline-flex items-center gap-1 rounded-sm bg-golfe-green px-2 py-0.5 text-xs font-semibold text-white">
                  <Plus size={11} /> Nouveau produit
                </span>{" "}
                en haut à droite. Une fenêtre s'ouvre avec les champs suivants :
              </p>
              <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-gris">
                <li>
                  <strong className="text-nuit">Photo</strong> — envoyez une image, ou laissez un emoji par défaut si
                  vous n'en avez pas encore.
                </li>
                <li>
                  <strong className="text-nuit">Nom du produit</strong> (obligatoire) — ex. "Pizza Margherita".
                </li>
                <li>
                  <strong className="text-nuit">Description</strong> — ingrédients, particularités. Facultatif mais
                  conseillé.
                </li>
                <li>
                  <strong className="text-nuit">Prix (€)</strong> (obligatoire) — le prix de base, avant suppléments.
                </li>
                <li>
                  <strong className="text-nuit">Catégorie</strong> (obligatoire) — choisissez dans la liste proposée
                  ou "Autre (personnalisée)" pour en créer une nouvelle.
                </li>
                <li>
                  <strong className="text-nuit">Non disponible pour le moment</strong> — à cocher en cas de rupture
                  sur ce produit. Deux choix apparaissent alors : "Aujourd'hui seulement" (redevient disponible tout
                  seul le lendemain) ou "Jusqu'à nouvel ordre" (à vous de le réactiver). Décochée = produit
                  disponible normalement.
                </li>
                <li>
                  <strong className="text-nuit">Mettre en avant</strong> — ajoute une petite étoile ⭐ sur le
                  produit.
                </li>
              </ul>
              <p className="mt-2 text-sm leading-relaxed text-gris">
                Cliquez ensuite sur <strong className="text-nuit">"Créer"</strong>.
              </p>
            </div>
          </section>

          {/* Étape 3 */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-golfe-green text-xs font-bold text-nuit">
                3
              </span>
              <h3 className="font-heading text-sm font-bold text-nuit">Rouvrez-le pour ajouter des options</h3>
            </div>
            <div className="ml-8 rounded-sm bg-sable p-3 text-sm leading-relaxed text-nuit">
              Important : les options ne peuvent être ajoutées qu'<strong>une fois le produit créé</strong>, pas
              avant. Retrouvez votre produit dans la liste, puis cliquez sur l'icône crayon{" "}
              <Pencil size={12} className="inline" /> sur sa fiche pour le rouvrir. Une nouvelle section "🧩 Options"
              apparaît alors en bas de la fenêtre.
            </div>
          </section>

          {/* Étape 4 */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-golfe-green text-xs font-bold text-nuit">
                4
              </span>
              <h3 className="font-heading text-sm font-bold text-nuit">Créez un groupe d'options</h3>
            </div>
            <div className="ml-8">
              <p className="mb-2 text-sm leading-relaxed text-gris">
                Un <strong className="text-nuit">groupe</strong>, c'est une famille de choix pour le client — par
                exemple "La taille" (Petite / Moyenne / Grande), ou "Suppléments" (Fromage / Bacon / Œuf). Cliquez
                sur <strong className="text-nuit">"+ Groupe"</strong>, puis réglez :
              </p>
              <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-gris">
                <li>
                  <strong className="text-nuit">Obligatoire</strong> — cochez si le client DOIT choisir dans ce
                  groupe avant de commander (ex. la taille d'une pizza). Laissez décoché pour un groupe facultatif
                  (ex. des suppléments).
                </li>
                <li>
                  <strong className="text-nuit">Choix multiples</strong> — cochez si le client peut sélectionner
                  plusieurs options à la fois dans ce groupe (ex. plusieurs suppléments). Laissez décoché pour un
                  choix unique (ex. une seule taille).
                </li>
                <li>
                  <strong className="text-nuit">Choix maxi</strong> — visible seulement si "Choix multiples" est
                  coché ; limite le nombre de choix (laissez vide pour illimité).
                </li>
              </ul>
              <p className="mt-2 text-sm leading-relaxed text-gris">
                Ajoutez ensuite les choix avec <strong className="text-nuit">"+ Ajouter un choix"</strong> : un nom
                (ex. "Grande") et un supplément de prix (ex. +3 €, ou 0 € si ce choix n'ajoute rien au prix de base).
                Répétez l'opération pour autant de groupes que nécessaire (ex. "La taille", puis "Suppléments", puis
                "Sauce").
              </p>
              <p className="mt-2 text-sm leading-relaxed text-gris">
                <strong className="text-nuit">Quantité multiple</strong> — coché sous un choix précis (visible
                uniquement dans un groupe "Choix multiples"), il permet au client de l'ajouter plusieurs fois plutôt
                qu'une seule (ex. "Bacon" x4 s'il veut plusieurs suppléments de bacon). Le client voit alors un
                bouton +/- à la place de la case à cocher, jusqu'à 20 par choix. Laissez décoché pour un choix qu'on
                ne peut sélectionner qu'une fois (ex. une sauce).
              </p>
              <p className="mt-2 text-sm leading-relaxed text-gris">
                <strong className="text-nuit">Groupe conditionnel</strong> — visible à partir du 2ᵉ groupe créé, ce
                menu déroulant fait apparaître ce groupe UNIQUEMENT si un choix précis d'un groupe précédent est
                sélectionné. Exemple : vous proposez un burger "Seul ou En Menu" — créez d'abord un groupe "Formule"
                (Seul / En Menu), puis un groupe "Boisson" dont le "Groupe conditionnel" pointe vers "Formule : En
                Menu". Le client ne verra "Boisson" (et l'"Accompagnement" éventuel) que s'il a choisi "En Menu" —
                pas besoin de créer deux fiches produit séparées. Laissez sur "Aucune (toujours affiché)" pour un
                groupe classique.
              </p>
              <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-gris">
                <Ban size={14} className="mt-0.5 flex-shrink-0 text-red-400" />
                <span>
                  Rupture sur un choix précis (ex. plus de mozzarella) ? Cliquez sur l'icône{" "}
                  <Ban size={11} className="inline text-red-400" /> à côté de son prix, puis choisissez "Aujourd'hui
                  seulement" ou "Jusqu'à nouvel ordre" — le client le verra grisé, marqué "Indisponible".
                </span>
              </p>

              {/* Mini-exemple visuel */}
              <div className="mt-3 rounded-sm border border-gris-light p-3">
                <p className="mb-2 text-xs font-semibold text-nuit">Exemple pour une pizza :</p>
                <div className="flex flex-col gap-2 text-xs text-gris">
                  <div>
                    <span className="font-semibold text-nuit">Groupe "La taille"</span> — Obligatoire, choix unique
                    <div className="ml-3 mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-gris-light px-2 py-0.5">Petite +0 €</span>
                      <span className="rounded-full bg-gris-light px-2 py-0.5">Moyenne +2 €</span>
                      <span className="rounded-full bg-gris-light px-2 py-0.5">Grande +4 €</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-nuit">Groupe "Suppléments"</span> — Facultatif, choix
                    multiples
                    <div className="ml-3 mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-gris-light px-2 py-0.5">Fromage +1,5 €</span>
                      <span className="rounded-full bg-golfe-green/15 px-2 py-0.5 font-medium text-nuit">
                        Bacon +2 € · quantité multiple ✓
                      </span>
                      <span className="rounded-full bg-gris-light px-2 py-0.5">Œuf +1 €</span>
                    </div>
                    <p className="ml-3 mt-1 text-[11px] text-gris">
                      → le client pourra ajouter "Bacon" plusieurs fois (x2, x3, x4...), mais "Fromage" et "Œuf"
                      qu'une seule fois chacun.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-sm border border-gris-light p-3">
                <p className="mb-2 text-xs font-semibold text-nuit">Exemple "Seul ou En Menu" (groupe conditionnel) :</p>
                <div className="flex flex-col gap-2 text-xs text-gris">
                  <div>
                    <span className="font-semibold text-nuit">Groupe "Formule"</span> — Obligatoire, choix unique
                    <div className="ml-3 mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-gris-light px-2 py-0.5">Seul +0 €</span>
                      <span className="rounded-full bg-gris-light px-2 py-0.5">En Menu +3,5 €</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-nuit">Groupe "Boisson"</span> — Obligatoire, choix unique
                    <span className="ml-1 font-medium text-golfe-green">· Groupe conditionnel : Formule : En Menu</span>
                    <div className="ml-3 mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-gris-light px-2 py-0.5">Coca +0 €</span>
                      <span className="rounded-full bg-gris-light px-2 py-0.5">Eau +0 €</span>
                    </div>
                    <p className="ml-3 mt-1 text-[11px] text-gris">
                      → n'apparaît au client que s'il a choisi "En Menu" juste au-dessus.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-2 flex items-start gap-1.5 rounded-sm bg-golfe-green/5 p-2.5 text-sm leading-relaxed text-nuit">
                <Zap size={14} className="mt-0.5 flex-shrink-0 text-golfe-green" />
                <span>
                  <strong className="text-nuit">Raccourci</strong> — tant qu'aucune option n'a encore été ajoutée sur
                  le produit, le bouton <strong className="text-nuit">"⚡ Utiliser le modèle 'Seul / En Menu'"</strong> en
                  haut de la section "🧩 Options" pré-remplit directement ces 3 groupes (avec la dépendance déjà
                  câblée) — il ne reste qu'à ajuster les noms et prix des choix.
                </span>
              </p>
            </div>
          </section>

          {/* Étape 5 */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-golfe-green text-xs font-bold text-nuit">
                5
              </span>
              <h3 className="font-heading text-sm font-bold text-nuit">Réglages complémentaires, puis enregistrez</h3>
            </div>
            <div className="ml-8">
              <ul className="mb-2 flex flex-col gap-1.5 text-sm leading-relaxed text-gris">
                <li>
                  <strong className="text-nuit">Instructions spécifiques</strong> — autorise le client à écrire un
                  commentaire libre (ex. "bien cuit", "sans oignon").
                </li>
                <li>
                  <strong className="text-nuit">Frais supplémentaires possibles</strong> — affiche un message
                  d'avertissement au client sur d'éventuels frais additionnels.
                </li>
              </ul>
              <p className="text-sm leading-relaxed text-gris">
                Cliquez enfin sur <strong className="text-nuit">"Enregistrer les options"</strong> — un bouton à
                part, distinct de celui du produit lui-même.
              </p>
            </div>
          </section>

          {/* Astuce duplication */}
          <section className="rounded-sm bg-sable p-3">
            <div className="mb-1 flex items-center gap-2">
              <Copy size={14} className="text-nuit" />
              <h3 className="font-heading text-sm font-bold text-nuit">Astuce : dupliquer un produit</h3>
            </div>
            <p className="text-sm leading-relaxed text-gris">
              Pour aller plus vite avec des produits similaires (plusieurs pizzas, plusieurs poke bowls...), utilisez
              l'icône de duplication sur une fiche existante — la copie s'ouvre directement en modification, il ne
              reste qu'à changer le nom, la photo et le prix.
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-gris">
              Ça marche aussi pour plusieurs produits "Seul ou En Menu" : composez une première fois les groupes
              "Formule"/"Boisson"/"Accompagnement" sur un seul produit (voir l'exemple ci-dessus), puis dupliquez-le
              pour vos autres burgers/sandwichs — il ne reste qu'à changer le produit principal, tout le reste
              (boissons, accompagnements, dépendances) est repris automatiquement.
            </p>
          </section>

          {/* Astuce rupture de stock */}
          <section className="rounded-sm bg-sable p-3">
            <div className="mb-1 flex items-center gap-2">
              <Ban size={14} className="text-nuit" />
              <h3 className="font-heading text-sm font-bold text-nuit">Astuce : gérer une rupture de stock</h3>
            </div>
            <p className="text-sm leading-relaxed text-gris">
              Deux niveaux possibles, selon ce qui manque :
            </p>
            <ul className="mt-1.5 flex flex-col gap-1 text-sm leading-relaxed text-gris">
              <li>
                <strong className="text-nuit">Tout un produit</strong> — cochez{" "}
                <strong className="text-nuit">"Non disponible pour le moment"</strong> sur sa fiche (étape 2), ou
                directement la case "Disponible" depuis la liste des produits.
              </li>
              <li>
                <strong className="text-nuit">Un seul choix dans un groupe</strong> (ex. une seule taille, une seule
                sauce) — utilisez l'icône <Ban size={11} className="inline text-red-400" /> à côté de ce choix,
                dans la section "🧩 Options" (étape 4). Le reste du produit et des autres choix restent disponibles.
              </li>
            </ul>
            <p className="mt-1.5 text-sm leading-relaxed text-gris">
              Dans les deux cas, choisissez <strong className="text-nuit">"Aujourd'hui seulement"</strong> si ça
              revient le lendemain (remis en ligne tout seul, rien à refaire), ou{" "}
              <strong className="text-nuit">"Jusqu'à nouvel ordre"</strong> si vous ne savez pas encore quand —
              vous le réactiverez vous-même le moment venu.
            </p>
          </section>

          {/* Offre prise en charge */}
          <section className="rounded-sm border-2 border-golfe-green/30 bg-golfe-green/5 p-4">
            <h3 className="mb-1 font-heading text-sm font-bold text-nuit">Vous préférez qu'on s'en charge ?</h3>
            <p className="mb-3 text-sm leading-relaxed text-gris">
              Si vous manquez de temps ou préférez que notre équipe mette votre carte en ligne à votre place
              (produits, photos, catégories et options), c'est possible via un forfait adapté à la taille de votre
              carte. Écrivez-nous avec le détail de vos produits et on s'occupe du reste.
            </p>
            <a
              href="mailto:contact@doyougeckoo.fr?subject=Mise%20en%20ligne%20de%20ma%20carte%20produits"
              className="inline-flex items-center gap-2 rounded-sm bg-nuit px-4 py-2 text-sm font-semibold text-white hover:bg-nuit-light"
            >
              <Mail size={15} />
              Nous contacter — contact@doyougeckoo.fr
            </a>
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm bg-golfe-green px-5 py-2 text-sm font-semibold text-nuit hover:bg-golfe-green-dark hover:text-white"
          >
            Compris, fermer
          </button>
        </div>
      </div>
    </div>
  );
}
