# Problèmes Actuels - Globe 3D & Popups

**Date:** 13 décembre 2025  
**Composant:** `wireframe-dotted-globe.tsx`

---

## 🚨 Problèmes Identifiés

### 1. Trait de Connexion Manquant au Scroll

**Symptôme:**
- Lors de la navigation au scroll entre les destinations chronologiques, la popup s'affiche correctement mais **le trait blanc de connexion n'apparaît pas**
- Le trait ne s'affiche que lors d'un clic manuel sur une ville

**Cause Probable:**
- Race condition entre l'affichage de la popup et le calcul de ses dimensions
- La référence `destinationPopupDimensionsRef` n'est pas mise à jour assez rapidement pour le moteur de rendu Canvas
- Le Canvas tente de dessiner le trait **avant** que React n'ait calculé les dimensions de la popup

**Zone de Code Concernée:**
```typescript
// useEffect pour mettre à jour les dimensions de la popup destination
useEffect(() => {
  if (destinationPopupRef.current && autoShowDestinationInfo) {
    const updateDimensions = () => {
      if (destinationPopupRef.current) {
        const width = destinationPopupRef.current.offsetWidth;
        const height = destinationPopupRef.current.offsetHeight;
        const rect = destinationPopupRef.current.getBoundingClientRect();
        
        const dims = { x: rect.left, y: rect.top, width, height, radius: 12 };
        setDestinationPopupDimensions(dims);
        // ❌ PROBLÈME: destinationPopupDimensionsRef.current n'est pas mis à jour ici
      }
    };
    // ...
  }
}, [autoShowDestinationInfo, ...]);
```

**Solution Proposée:**
- Mettre à jour `destinationPopupDimensionsRef.current` **immédiatement** dans la fonction `updateDimensions()`
- Garantir la synchronisation entre le state React et la ref utilisée par Canvas

---

### 2. Positionnement des Popups en Mode "Sous-Menu Ouvert"

**Symptôme:**
- Quand le panneau latéral/timeline est ouvert (`isPanelOpen = true`), les popups apparaissent à des positions "aléatoires" mais **sortent du champ visuel**
- Les popups se retrouvent cachées derrière le panneau ou hors de l'écran à droite
- La taille des popups n'est pas adaptée à l'espace réduit disponible

**Cause:**
- La fonction `generateRandomPosition()` ne prend pas en compte la réduction de l'espace disponible lorsque le panneau est ouvert
- Les popups utilisent toujours la même zone de positionnement (4-20% left) même quand le panneau occupe ~30-40% de l'écran
- Le globe lui-même est décalé vers la droite (`translateX(-25%)`) mais les popups ne suivent pas ce décalage

**Zone de Code Concernée:**
```typescript
const generateRandomPosition = useCallback((isVisited: boolean = false) => {
  const topMin = 8;
  const topMax = 35;
  
  // 🎯 AJUSTEMENT POUR MODE SPLIT : décaler vers la droite quand le panneau est ouvert
  const leftOffset = isPanelOpen ? 25 : 0; // ❌ INSUFFISANT
  const leftMin = 4 + leftOffset;
  const leftMax = (isVisited ? 20 : 8) + leftOffset; // ❌ TROP RESTREINT
  
  // Logique de génération aléatoire...
}, [popupPosition, isPanelOpen]);
```

**Problèmes Détectés:**
1. **Offset insuffisant:** +25% ne suffit pas pour éviter la zone du panneau
2. **Plage trop restreinte:** La plage maximale (leftMax) reste trop à gauche, les popups se retrouvent écrasées
3. **Pas d'ajustement de taille:** Les popups gardent leurs dimensions normales même quand l'espace est réduit

**Solution Proposée:**
- Augmenter `leftOffset` à ~32-35% pour dégager complètement le panneau
- Étendre `leftMax` jusqu'à 55-65% pour utiliser l'espace central/droit libre
- Adapter la taille des popups (classes Tailwind) selon `isPanelOpen`

**Exemple de Correction:**
```typescript
const leftOffset = isPanelOpen ? 32 : 0;
const leftMin = 4 + leftOffset;
const leftMax = isPanelOpen 
  ? (isVisited ? 65 : 55)  // Zone centrale/droite quand panneau ouvert
  : (isVisited ? 20 : 8);   // Zone gauche quand panneau fermé
```

---

## 📐 Architecture du Système de Popups

### Flux d'Affichage

1. **Trigger:** Scroll ou clic sur une ville
2. **Animation Globe:** Rotation/zoom vers la destination (1.5-4.4s)
3. **Génération Position:** `generateRandomPosition()` calcule coordonnées aléatoires
4. **Affichage Popup:** React monte le composant JSX
5. **Calcul Dimensions:** `useEffect` mesure la popup montée
6. **Dessin Trait:** Canvas render loop utilise les dimensions pour tracer la ligne

### Points Critiques

**Race Conditions:**
- Canvas render loop s'exécute à 60fps indépendamment de React
- Si dimensions pas prêtes, le trait ne peut pas être dessiné
- Nécessite synchronisation parfaite entre React state et refs

**Dépendances:**
- `destinationPopupDimensionsRef.current` → Utilisée par Canvas
- `destinationPopupDimensions` state → Utilisée par React pour UI
- Les deux doivent être synchronisées en temps réel

---

## 🔧 État Actuel du Code

**Fichiers Affectés:**
- `src/components/ui/wireframe-dotted-globe.tsx` (ligne ~880-950)

**Refs Impliquées:**
- `destinationPopupDimensionsRef` - Dimensions de la popup de destination
- `cityPopupDimensionsRef` - Dimensions de la popup de ville
- `popupPositionRef` - Position calculée (top/left en %)
- `isPanelOpenRef` - État du panneau latéral

**États React:**
- `autoShowDestinationInfo` - Info de destination à afficher
- `selectedCity` - Ville sélectionnée (clic manuel)
- `popupPosition` - Position {top, left} en %
- `isPanelOpen` - État du panneau (prop externe)

---

## 🎯 Priorités de Correction

1. **CRITIQUE:** Trait manquant au scroll (affecte UX principale)
2. **HAUTE:** Positionnement popup en mode split (affecte lisibilité)
3. **MOYENNE:** Optimiser taille popup selon espace disponible

---

## 📝 Notes Techniques

### Canvas Drawing Loop
Le trait est dessiné dans la fonction `render()` qui s'exécute en RAF (RequestAnimationFrame):
```typescript
// 2. Ligne pour la destination auto (Scroll)
if (!selectedCityRef.current && autoShowDestinationInfo && 
    lineProgress > 0 && destinationPopupDimensionsRef.current) {
  // Calcul point de départ (bord du cercle de la ville)
  // Calcul point d'arrivée (coin bas-droit de la popup)
  // Dessin du trait avec Canvas API
}
```

### Timing d'Animation
- **Popup apparition:** 466ms (cubic-bezier)
- **Trait apparition:** Commence après 50ms (LINE_APPEAR_DELAY_S)
- **Dessin progressif:** 1000ms (animation de longueur)

---

## 🚀 Prochaines Étapes

1. Appliquer les corrections pour la synchronisation des refs
2. Tester la navigation au scroll (vérifier apparition trait)
3. Ajuster `generateRandomPosition()` pour mode split
4. Tester avec panneau ouvert/fermé
5. Valider responsive (mobile, tablette, desktop)
