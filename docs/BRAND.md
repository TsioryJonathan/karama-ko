# Le sceau Karama-Ko

Le K reprend le monogramme du favicon. Les six ellipses entrelacées rappellent les guillochis des billets de l’accueil. Le symbole est vectoriel et son fond transparent : aucune police ni bibliothèque n’est nécessaire.

## Fichiers

Les SVG autonomes sont dans `public/brand/` :

- `karama-mark.svg` : symbole principal.
- `karama-loading.svg` : K fixe, arc périphérique animé en 2,4 secondes.
- `karama-empty.svg` : état vide.
- `karama-success.svg` : confirmation.
- `karama-error.svg` : erreur.
- `karama-offline.svg` : hors connexion.

Ouvrir `/brand/preview.html` pour voir et télécharger les variantes sur fond clair ou sombre.

## Dans React

```tsx
import { BrandMark } from './components/BrandMark'

<div role="status">
  <BrandMark state="loading" size={112} />
  <p>Préparation de votre atelier…</p>
</div>
```

`state` accepte `mark`, `loading`, `empty`, `success`, `error` et `offline`.
Le composant est décoratif : toujours accompagner le symbole d’un texte qui explique l’état. Les badges distinguent les états sans dépendre uniquement de la couleur. Garder le logo simple pour les très petites tailles ; réserver les badges à 64 px et plus. Le chargement compact de l’assistant utilise 32 px.

Les SVG passent du bordeaux `#7a2640` au rose `#e69aaf` selon le `color-scheme` du conteneur. Ils respectent `prefers-reduced-motion`. Le fond des badges reprend le fond de page du thème. Pour les placer sur une autre surface, adapter `--paper` dans le SVG.

Le chargement initial HTML et le composant React utilisent le même fichier. Les six fichiers sont inclus dans le cache PWA par la configuration SVG existante. La variante `success` est disponible pour les confirmations futures ; les messages de confirmation existants conservent leur texte.
