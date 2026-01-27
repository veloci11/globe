This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🚀 Performance Optimizations (Nov 2025)

Les animations du globe ont été significativement optimisées pour atteindre ~60fps stables :

### Problèmes corrigés
- **Re-renders React excessifs** : Les valeurs d'animation à haute fréquence (`greenLinesProgress`, `pulseProgress`) utilisaient `useState`, causant des re-renders à chaque frame
- **Calculs redondants** : Les distances et timings des routes vertes étaient recalculés à CHAQUE frame (récursion coûteuse)
- **Boucle d'animation inefficace** : Plusieurs boucles RAF (requestAnimationFrame) non coordonnées

### Solutions implémentées

1. **Refs au lieu de States pour l'animation**
   - `greenLinesProgressRef` et `pulseProgressRef` remplacent les states
   - Plus de re-render React pendant l'animation → gain massif de performance

2. **Cache pré-calculé des routes vertes**
   - `GREEN_ROUTES_CACHE` calculé UNE SEULE FOIS au chargement du module
   - Contient : distances, facteurs de vitesse, temps de démarrage de chaque ligne
   - Élimine ~40 appels de fonctions récursives par frame

3. **Boucle d'animation centralisée**
   - Un seul `requestAnimationFrame` gère le rendu
   - Throttling à ~60fps pour éviter les frames inutiles
   - Animation fluide même avec 40+ lignes animées simultanément

4. **Constantes statiques hors composant**
   - `GREEN_CITIES` et `GREEN_ROUTES_RAW` déplacés en dehors du composant
   - Élimine les recréations d'objets à chaque render

### Conseils pour maintenir les performances

- **Ne JAMAIS utiliser `useState` pour des valeurs qui changent à 60fps** - utiliser `useRef`
- **Pré-calculer tout ce qui peut l'être** en dehors des boucles de rendu
- **Un seul RAF central** pour coordonner toutes les animations
- **Éviter les recréations d'objets/tableaux** dans la fonction render()

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
