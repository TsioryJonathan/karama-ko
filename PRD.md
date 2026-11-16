# PRD — Simulateur IRSA & salaire net Madagascar

Nov 16, 2026 · @Tsiory Jonathan

## Résumé

**Karama** (« salaire » en malgache) est une web app gratuite qui calcule en moins de 30 secondes le salaire net, l'IRSA, la CNaPS, l'OSTIE et le coût employeur à partir d'un salaire brut, selon le barème 2026.

Le problème : les salariés ne comprennent pas leur fiche de paie, les candidats négocient en brut sans savoir ce qu'ils toucheront, et les petits employeurs calculent à la main sur Excel. Les simulateurs existants sont souvent des pages remplies de pub, peu lisibles sur mobile.

**Pas d'authentification.** Tout le calcul se fait dans le navigateur : aucune donnée n'est envoyée ni stockée sur un serveur, donc il n'y a rien à protéger derrière un compte. Les dernières saisies restent dans le navigateur (localStorage), et une simulation se partage par un lien qui contient les paramètres. Résultat : zéro backend, zéro coût d'hébergement, zéro donnée personnelle collectée.

## Utilisateurs et cas d'usage

Quatre profils, une même question de fond : « combien je touche vraiment, et pourquoi ? »

| Profil | Sa question | Ce que Karama lui donne |
| --- | --- | --- |
| Salarié du privé | « Ma fiche de paie est-elle juste ? » | Le net, et chaque retenue expliquée ligne par ligne |
| Candidat ou salarié qui négocie | « Quel brut demander pour toucher 1 500 000 Ar net ? » | Le calcul inversé net → brut |
| Petit employeur, RH de PME | « Combien me coûte vraiment ce poste ? » | Le coût total employeur avec les parts patronales |
| Freelance qui compare un CDI | « Cette offre vaut-elle mon revenu actuel ? » | Deux simulations côte à côte (v1.1) |

Le cas principal : un utilisateur sur smartphone, connexion moyenne, qui tape un montant et veut le net immédiatement, sans créer de compte ni lire un article.

## Concurrence et différenciation

Des simulateurs existent déjà ; Karama se distingue par la justesse du barème 2026, l'explication et le design, pas par l'idée.

| Outil existant | Limite constatée | Réponse de Karama |
| --- | --- | --- |
| [AfroTools](https://afrotools.com/fr/madagascar/calculateur-salaire-net/) | Site générique 54 pays ; annonce un barème 2026 à 0–20 %, sans la tranche à 25 % | Barème 2026 complet, sources datées dans l'app |
| [macalculatriceenligne.com](https://macalculatriceenligne.com/afrique/calcul-impots-madagascar/) | Site français généraliste, centré article et référencement | Interface d'abord, net visible dès la première frappe |
| Rivermate, [Mercans](https://dsr.mercans.com/?p=891) | Outils de paie pour entreprises étrangères, en anglais | Grand public, français puis malgache |

**Angles propres à Karama** : le calcul inversé pour négocier un salaire, le détail pédagogique de la fiche de paie, le partage en un lien sur Facebook ou WhatsApp, et l'interface en malgache en v1.1.

## Périmètre MVP

Le MVP couvre le salarié non agricole du secteur privé, en mensuel. Tout le reste attend la v1.1.

**Inclus**

- Saisie du brut mensuel en Ariary, avec formatage en direct (`1 000 000`)
- Nombre de personnes à charge (0 à 6)
- Résultat instantané : net, IRSA, CNaPS, OSTIE, taux effectif d'imposition
- Détail du calcul tranche par tranche, dépliable
- Vue employeur : parts patronales et coût total
- Calcul inversé net → brut
- Partage par lien (`?brut=1000000&pac=2`) et impression propre de la simulation (CSS print, export PDF par le navigateur)
- PWA installable, utilisable hors ligne après la première visite
- Thème clair et sombre

**Exclu du MVP**

- Comptes, connexion, sauvegarde dans le cloud
- Heures supplémentaires, primes, avantages en nature, indemnités exonérées
- Secteur public, régime agricole, travailleurs indépendants
- Génération d'une fiche de paie officielle

**v1.1** : comparateur de deux offres, interface en malgache, saisie des primes et avantages.

## Règles de calcul (barème 2026)

L'IRSA 2026 suit 6 tranches de 0 % à 25 %, la tranche à 25 % au-delà de 4 000 000 Ar étant la nouveauté de la loi de finances 2026 ([PaySpace](https://support.payspace.com/portal/en/kb/articles/madagascar-2026-finance-law)). Les chiffres ci-dessous viennent d'une source secondaire ([macalculatriceenligne.com](https://macalculatriceenligne.com/afrique/calcul-impots-madagascar/)) et doivent être confrontés au texte officiel avant la mise en ligne.

**Barème IRSA mensuel, sur la base imposable**

| Tranche de base imposable (Ar) | Taux | IRSA cumulé en fin de tranche (Ar) |
| --- | --- | --- |
| 0 à 350 000 | 0 % | 0 |
| 350 001 à 400 000 | 5 % | 2 500 |
| 400 001 à 500 000 | 10 % | 12 500 |
| 500 001 à 600 000 | 15 % | 27 500 |
| 600 001 à 4 000 000 | 20 % | 707 500 |
| Au-delà de 4 000 000 | 25 % | 707 500 + 25 % de l'excédent |

**Cotisations**

| Cotisation | Part salarié | Part employeur | Plafond part salarié |
| --- | --- | --- | --- |
| CNaPS | 1 % | 13 % | 21 014,40 Ar / mois |
| OSTIE | 1 % | 5 % | 21 014,40 Ar / mois |

Le plafond vaut 1 % × 8 × SME, avec un SME non agricole de 262 680 Ar (décret n° 2024-453).

**Ordre de calcul**

1. CNaPS salarié = min(brut × 1 %, 21 014,40)
2. OSTIE salarié = min(brut × 1 %, 21 014,40)
3. Base imposable = brut − CNaPS − OSTIE, arrondie à la centaine inférieure
4. IRSA brut = barème progressif appliqué à la base
5. IRSA = IRSA brut − 2 000 Ar par personne à charge
6. Si la base dépasse 350 000 Ar, l'IRSA ne descend pas sous 3 000 Ar (minimum de perception)
7. Net = brut − CNaPS − OSTIE − IRSA

```latex
\text{Net} = B - \min(0{,}01B;\,P) - \min(0{,}01B;\,P) - \max\big(T(\lfloor b \rfloor_{100}) - 2000\,n;\ m\big)
```

Où B = brut, P = plafond, b = base imposable, T = barème, n = personnes à charge, m = 3 000 Ar si b > 350 000, sinon 0.

**Cas de référence (test d'acceptation)** : brut 1 000 000 Ar, 0 personne à charge → CNaPS 10 000, OSTIE 10 000, base 980 000, IRSA 103 500, **net 876 500 Ar**. Avec 2 personnes à charge : IRSA 99 500, net 880 500 Ar.

**Points à vérifier avant la mise en ligne**

- [ ] Barème, minimum et réduction pour charges de famille dans la loi de finances 2026 (Loi n° 2025-021) et le Code général des impôts
- [ ] Plafond des personnes à charge : la source donne 6 maximum
- [ ] Valeur actuelle du SME : Mercans indique un SME de 300 000 Ar et un plafond de cotisation de 2 400 000 Ar par mois, contre 262 680 Ar dans le décret 2024-453 ; le plafond change selon la valeur retenue
- [ ] Parts patronales et leurs plafonds : les sources divergent (OSTIE patronal de 1,5 % à 5 % selon les sites, FMFP 1 % parfois ajouté)
- [ ] Loi de finances rectificative 2026 et PLFI 2027 : le minimum de perception de l'IRSA serait modifié en 2027 ([Newsmada](https://newsmada.com/?p=202863)), d'où un barème versionné par année

Chaque barème affiché dans l'app porte sa source et sa date de mise à jour, et un avertissement indique que le résultat est une estimation.

## Parcours et écrans

Une seule page : le net apparaît dès le premier chiffre tapé, sans bouton « Calculer ».

1. **Accueil-saisie** : une phrase d'accroche, un grand champ « Salaire brut mensuel », un sélecteur de personnes à charge (− / +), et un interrupteur « Je connais mon net » pour le calcul inversé.
2. **Résultat** : le net en très grand, le taux effectif en dessous, puis le ruban de répartition qui montre où part chaque ariary du brut (CNaPS, OSTIE, IRSA, net).
3. **Détail du calcul** : un accordéon qui reprend les 7 étapes avec les montants, et le barème avec la tranche atteinte mise en évidence.
4. **Vue employeur** : un onglet qui ajoute les parts patronales et le coût total du poste.
5. **Partager / imprimer** : copier le lien, partager via le menu natif du téléphone (Web Share API), ou imprimer une fiche récapitulative propre.
6. **Page Barèmes & sources** : les tables en vigueur, leurs sources, la date de mise à jour et l'avertissement.

Sur desktop, la saisie reste fixée à gauche et le résultat défile à droite. Sur mobile, tout s'empile, et le net reste visible dans une barre collante en bas pendant qu'on ouvre le détail.

## Direction de design

Le parti pris : **sobre, éditorial, typographique**. L'interface est en noir, gris et blanc ; le net s'affiche en très grand ; la couleur est réservée aux montants. L'esprit visé est celui d'un relevé de banque privée ou d'un rapport annuel au graphisme suisse, pas celui d'une landing page de startup.

**Polices**

| Rôle | Police | Graisses | Usage |
| --- | --- | --- | --- |
| Affichage | Clash Display (Fontshare) | 500, 600 | Le net, les titres de section |
| Interface | Cabinet Grotesk (Fontshare) | 400, 500, 700 | Labels, boutons, texte, tableaux |
| Chiffres du détail | Geist Mono | 400 | Colonnes de montants alignées |

Clash et Cabinet ne sont pas sur Google Fonts : télécharger les fichiers sur Fontshare, vérifier la licence, les servir en `woff2` depuis `/public/fonts` avec `font-display: swap`, uniquement les graisses listées.

**Couleurs**

| Token | Clair | Sombre | Usage |
| --- | --- | --- | --- |
| `--bg` | #F7F6F3 | #0F0F0E | Fond de page |
| `--surface` | #FFFFFF | #181817 | Champ de saisie, panneau résultat |
| `--ink` | #111110 | #EDEBE6 | Texte, boutons pleins |
| `--ink-muted` | #6E6B66 | #9C988F | Labels, texte secondaire |
| `--line` | #E4E2DD | #2A2927 | Filets de séparation |
| `--deduction` | #B4441F | #E0703F | Montants retenus (CNaPS, OSTIE, IRSA) |
| `--net` | #1F5E4A | #5FB394 | Le net, uniquement |
| `--warning` | #94600F | #E3A84A | Avertissement de barème |

Contrastes calculés sur le fond, pour un seuil WCAG AA de 4,5:1 : texte secondaire 4,9:1, retenues 5,1:1, net 7,0:1, avertissement 4,9:1 en clair ; tous au-dessus de 5,9:1 en sombre. Les boutons sont noirs pleins, texte blanc cassé : la couleur ne sert jamais à décorer.

**Ce qui rend l'interface classe**

- Grille de 12 colonnes, alignements stricts, beaucoup de blanc : 96 px entre les sections sur desktop.
- Hiérarchie par la taille et la graisse, jamais par la couleur.
- Séparations par filets de 1 px, pas par des cartes empilées.
- Le net en Clash Display 96 px sur desktop, 56 px sur mobile, interlettrage −0,03em.
- Labels en Cabinet Grotesk 12 px, capitales, interlettrage 0,08em, gris.
- Montants alignés à droite en chiffres tabulaires, comme sur un relevé.
- Typographie juste : `876 500 Ar` avec espace fine insécable, vrai signe moins (−) devant les retenues, guillemets français.
- États soignés : champ vide, montant hors limites, focus clavier.

**Interdit (le « design IA » générique)**

- Dégradés, effet verre dépoli, halos lumineux, formes flottantes en fond.
- Violet ou bleu « tech », néons, plus de deux couleurs d'accent.
- Emoji et icônes décoratives ; seules quelques icônes fonctionnelles fines (copier, partager, imprimer).
- Hero centré avec badge « Nouveau », titre, sous-titre et deux boutons.
- Grille de trois cartes « fonctionnalités » avec icône.
- Ombres portées, coins très arrondis : rayon de 6 px maximum, et 0 pour les blocs de section.
- Phrases marketing creuses (« Simplifiez votre vie financière ») : le texte dit des faits.
- Animations au défilement et effets sans fonction.

**Échelle typographique** : 12 · 14 · 16 · 20 · 24 · 32 · 48 · 96 px. Texte courant 16 px, interligne 1,5 ; titres interligne 1,05.

**Espacements** : base 4 px, échelle 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128. Conteneur de 1120 px maximum, gouttière de 24 px.

**Éléments signature**

- **Le ruban de répartition** : une barre fine de 8 px, segments à angles droits séparés par 2 px de blanc, retenues en `--deduction`, net en `--net`, légende alignée dessous en chiffres tabulaires.
- **Le net qui compte** : le montant défile jusqu'à sa valeur en 300 ms à chaque changement.
- **Le barème vivant** : un tableau des tranches où celles atteintes se remplissent, montant par tranche aligné à droite.

**Mise en page du résultat : une grille éditoriale, pas un bento**

Le résultat est une grille de cases séparées par des filets de 1 px, comme un tableau imprimé : une case dominante pour le net, des cases calmes pour le reste.

```
┌───────────────────────────────┬───────────────┐
│ SALAIRE NET                   │ TAUX EFFECTIF │
│                               │               │
│ 876 500 Ar                    │ 12,35 %       │
│                               │               │
├───────────┬───────────┬───────┴───────────────┤
│ IRSA      │ CNaPS     │ OSTIE                 │
│ −103 500  │ −10 000   │ −10 000               │
├───────────┴───────────┴───────────────────────┤
│ Ruban de répartition du brut                  │
└───────────────────────────────────────────────┘
```

- Filets de 1 px en `--line` entre les cases ; pas d'espace entre elles, pas d'ombre, angles droits.
- Label en capitales grises 12 px en haut à gauche de chaque case, chiffre en dessous ; aucune icône.
- La case du net occupe environ deux tiers de la largeur ; les autres chiffres restent en 24 à 32 px.
- La couleur ne touche que les chiffres, jamais le fond des cases.
- Mobile : net en pleine largeur, puis taux effectif, puis les trois retenues sur une ligne, puis le ruban.
- Taux effectif = (brut − net) / brut ; 12,35 % pour le cas de référence à 1 000 000 Ar.

**Mouvement et accessibilité** : transitions de 150 à 300 ms, coupées sous `prefers-reduced-motion`. Focus visible en contour noir de 2 px décalé de 2 px, cibles tactiles de 44 px minimum, `inputmode="numeric"` sur le champ.

```css
:root {
  --bg: #F7F6F3; --surface: #FFFFFF; --ink: #111110; --ink-muted: #6E6B66;
  --line: #E4E2DD; --deduction: #B4441F; --net: #1F5E4A; --warning: #94600F;
  --font-display: 'Clash Display', sans-serif;
  --font-ui: 'Cabinet Grotesk', system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;
  --radius: 6px;
}
[data-theme='dark'] {
  --bg: #0F0F0E; --surface: #181817; --ink: #EDEBE6; --ink-muted: #9C988F;
  --line: #2A2927; --deduction: #E0703F; --net: #5FB394; --warning: #E3A84A;
}
```

## Architecture technique

Un site statique, sans serveur ni base de données : le moteur de calcul est une fonction TypeScript pure, et les barèmes sont des fichiers JSON versionnés par année.

| Brique | Choix | Coût |
| --- | --- | --- |
| Front | Vite + React + TypeScript | 0 |
| Style | Tailwind CSS v4, tokens en variables CSS | 0 |
| Animations | CSS transitions, Motion pour le ruban et le compteur | 0 |
| Tests | Vitest (moteur), Playwright (parcours) | 0 |
| Hors ligne | `vite-plugin-pwa` (service worker + manifest) | 0 |
| Hébergement | Cloudflare Pages ou Vercel, offre gratuite | 0 |
| Statistiques | Cloudflare Web Analytics, sans cookie | 0 |

```
karama/
├─ src/
│  ├─ engine/          # calcul pur, sans React
│  │  ├─ compute.ts    # brut → détail complet
│  │  ├─ inverse.ts    # net → brut (recherche dichotomique)
│  │  └─ compute.test.ts
│  ├─ baremes/
│  │  └─ 2026.json     # tranches, taux, plafonds, sources, date
│  ├─ components/      # Champ, Ruban, BarèmeVivant, Carte résultat
│  ├─ i18n/fr.json     # mg.json en v1.1
│  └─ App.tsx
└─ README.md
```

**Règles d'implémentation**

- Tous les montants en entiers d'Ariary ; le plafond 21 014,40 Ar se garde en centimes pour éviter les erreurs d'arrondi.
- Le calcul inversé cherche le brut par dichotomie entre le net et 2 × net, jusqu'à 1 Ar près, car le barème n'est pas inversible directement avec le minimum et les plafonds.
- L'état de la saisie vit dans l'URL (`?brut=1000000&pac=2&vue=employeur`) : c'est ce qui rend le partage gratuit et sans compte.
- Le localStorage ne garde que la dernière saisie, dans un `try/catch`.
- Ajouter le barème 2027 = ajouter un fichier JSON, sans toucher au moteur.

**Confidentialité** : aucun montant ne quitte le navigateur. La page Barèmes & sources le dit en une phrase, c'est un argument de confiance pour un outil qui touche au salaire.

## Tests et critères d'acceptation

Le MVP est livrable quand le moteur passe ses cas de référence et que la page tient ses objectifs de performance sur un téléphone moyen.

**Moteur**

- [ ] Brut 1 000 000 Ar, 0 charge → net 876 500 Ar ; 2 charges → net 880 500 Ar
- [ ] Brut sous 350 000 Ar → IRSA 0 ; base juste au-dessus → IRSA de 3 000 Ar minimum
- [ ] Brut 5 000 000 Ar → CNaPS et OSTIE plafonnées, tranche 25 % appliquée
- [ ] Propriété : le net augmente toujours quand le brut augmente
- [ ] Propriété : inverse(net(brut)) retombe sur le brut à 1 Ar près
- [ ] Au moins 3 cas recoupés avec une vraie fiche de paie ou un cabinet

**Produit**

- [ ] Résultat affiché en moins de 50 ms après chaque frappe
- [ ] Lighthouse ≥ 95 sur les quatre axes, JS < 100 Ko gzip
- [ ] Fonctionne hors ligne après la première visite
- [ ] Un lien partagé rouvre exactement la même simulation
- [ ] Utilisable au clavier seul, contrastes AA en clair et en sombre
- [ ] Lisible de 360 px à 1440 px de large

**Métriques après lancement** : simulations par jour, part des visites qui ouvrent le détail, liens partagés, installations de la PWA.

## Roadmap et plan de livraison

Karama est la première brique d'une suite : le générateur de factures (n°2) et le guide des démarches (n°6) réutilisent le même design, le même formatage des montants et la même coquille PWA. Dans un portfolio, ça se présente comme un produit cohérent plutôt que trois démos séparées.

&#91;embedded content: roadmap · 4 phases sur un socle commun\]

Chaque phase est livrable seule ; le socle se construit pendant la phase 1 et ne bouge presque plus ensuite.

**Ordre de construction de la phase 1**

1. Moteur de calcul, barème 2026 en JSON et tests des cas de référence
2. Tokens de design et composants de base (champ, carte, onglets)
3. Écran saisie + résultat + ruban de répartition
4. Détail du calcul, vue employeur, calcul inversé
5. PWA, lien de partage, impression, déploiement sur Cloudflare Pages
6. README avec captures, GIF de démo, lien en ligne et sources des barèmes

## Sources

- [Madagascar | 2026 Finance Law — PaySpace](https://support.payspace.com/portal/en/kb/articles/madagascar-2026-finance-law)
- [Calcul IRSA Madagascar 2026 — macalculatriceenligne.com](https://macalculatriceenligne.com/afrique/calcul-impots-madagascar/)
- [IRSA – PLFI 2027 : le minimum de perception — Newsmada](https://newsmada.com/?p=202863)


## Extension livrée : atelier salaire et assistant facultatif

À la demande de l’utilisateur, le périmètre dépasse maintenant la phase 1 : comparaison de deux à quatre situations, négociation à partir d’un supplément net, graphique interactif, rapprochement manuel d’une fiche de paie, calcul depuis le budget employeur, budget d’équipe, projection de douze mois à barème constant, sauvegardes locales, partage/export et widget iframe.

Le calculateur reste le premier écran. L’atelier est séparé et conserve la palette bordeaux, le thème clair adouci et Cabinet Grotesk/Satoshi adoptés après les retours de design. Les demandes explicites de fond animé et de cases blanches au survol constituent des exceptions aux interdictions initiales sur les animations décoratives.

Un petit backend a été explicitement autorisé pour l’assistant IA. Il conserve la clé côté serveur et recalcule les résultats avant toute transmission au fournisseur. Le calcul local et les outils ne dépendent pas de ce service. L’IA explique les scénarios sur demande ; elle ne calcule pas les salaires. Son activation nécessite une clé API et peut entraîner des frais de fournisseur.

Les règles de paie initiales ne sont pas modifiées ni nouvellement certifiées. La projection applique le seul barème d’octobre 2026 à chacun des douze mois ; elle ne représente pas une reconstitution historique de l’année. Les primes, avantages, heures supplémentaires, OCR, comptes utilisateurs et observatoire de salaires restent hors périmètre.


### Accueil et identité : Karama-Ko

La demande suivante remplace le calculateur comme unique premier écran : un accueil avec billets 3D originaux, le nom Karama-Ko superposé, puis un répertoire des outils par besoin. Au défilement, les textes s’effacent et les billets se rassemblent. Le calculateur reste directement accessible et les liens de simulation existants l’ouvrent sans passer par l’accueil. L’animation utilise Three.js, avec réduction des animations et repli statique.
