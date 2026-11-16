# Karama-Ko : les billets entrelacés

Le symbole a d’abord été généré comme image avec l’outil intégré `imagegen`, puis vectorisé à partir de son canal alpha : sept contours, découpes conservées, courbes quadratiques et aplat bordeaux. Le SVG contient de vrais tracés, sans image PNG embarquée. Le monogramme K de la première proposition est remplacé sur les écrans d’état.

## Livrables

- `public/brand/karama-concept-v2.png` : image originale générée, avec transparence.
- `public/brand/karama-mark.svg` : logo vectoriel.
- `public/brand/karama-loading.svg` : silhouette légère qui se colore du bas vers le haut en 2,8 secondes, avec flottement et bascule discrets, puis s’efface doucement avant de recommencer. Cette boucle indique une attente, sans représenter un pourcentage réel.
- `public/brand/karama-{empty,success,error,offline}.svg` : variantes avec remplissage initial, mouvement ponctuel et badge dessiné progressivement. Confirmation : rebond ; erreur : secousse ; état vide : arrivée douce ; hors connexion : bascule. Après cette entrée, elles restent immobiles et lisibles.
- `/brand/preview.html` : aperçu avec téléchargements, thèmes clair et sombre et bouton pour rejouer les animations.

## Utilisation

```tsx
<BrandMark state="loading" size={112} />
```

Les états disponibles sont `mark`, `loading`, `empty`, `success`, `error` et `offline`. Le composant est décoratif : l’accompagner d’un texte qui explique l’état. Réserver les badges à 64 px et plus. La palette suit le `color-scheme` du conteneur : `#7a2640` en clair, `#e69aaf` en sombre. Le fond des badges (`--paper`) correspond au fond de page. L’animation respecte `prefers-reduced-motion`.

Les fichiers SVG sont inclus dans le cache PWA existant. Les variantes sont intégrées aux chargements HTML et React, à l’attente de l’assistant, aux pages d’erreur et aux simulations vides. `BrandFeedback` affiche aussi les confirmations et erreurs de sauvegarde, suppression, import, export et copie, ainsi que l’indisponibilité de l’assistant. Les notifications gardent leur texte et leur rôle accessible ; leur animation est relancée à chaque nouvelle action, même si le message se répète.

## Prompt de génération

Outil intégré `imagegen`, mode `logo-brand`, fond transparent. Prompt :

> Create one exceptional, professionally designed standalone pictorial logo for Karama-Ko, a salary understanding and planning app in Madagascar. The user rejected a plain letter K inside a decorative circle; invent an actual distinctive symbol, NOT typography or a monogram. Design direction: three folded banknote-like ribbons interlocking into a compact ascending woven knot, suggesting money becoming clarity, and mutual support. Refined sculptural geometry rendered as FLAT vector-style solid shapes, highly intentional negative space, strong recognizable silhouette, balanced rounded outer corners and crisp interior folds. A compact asymmetric triangular / rounded pinwheel arrangement, just 3 broad connected ribbon segments, visually clear at 32px, enough personality for animation as a loading indicator. Single deep burgundy #7A2640, with negative-space cuts to reveal the weaving; at most a secondary dark burgundy for a fold if essential. No literal currency symbols, no letter K, no letters, no text, no circular frame, no ornamental rosette, no gradients, no shadows, no 3D render, no mockup, no layout board. One centered logo only, large on a truly transparent background, generous clean margins. Make it feel like a distinctive contemporary Malagasy financial utility, understated, warm, trustworthy, and crafted. The output will be faithfully redrawn as actual SVG paths afterwards, so keep the geometry precise and traceable.

## Emplacements de marque

`BrandLogo` associe le symbole statique et le nom dans l’accueil, la barre des outils, les pages légales, les pages d’erreur, le pied de page et le widget. Sur téléphone, l’accueil conserve le symbole et masque visuellement le nom pour laisser la navigation disponible. Le nom du lien reste accessible. L’assistant affiche également le symbole dans son en-tête.

`public/icon.svg`, `favicon.ico` (16/32/48 px), `favicon-32.png`, `apple-touch-icon.png` (180 px), `icon-192.png`, `icon-512.png` et `icon-maskable-512.png` reprennent le même dessin. La version maskable conserve le symbole dans la zone de sécurité. Pour les régénérer : `node scripts/make-icons.mjs`. Le favicon porte une version dans son URL pour renouveler son cache. La signature de partage est générée avec `node scripts/make-og.mjs [url]`.
