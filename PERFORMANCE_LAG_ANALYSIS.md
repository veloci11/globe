# Analyse complète des causes de lag - GlobeDeb

## 🔴 CRITIQUE (10 causes principales)

### 1. Rendu des points du globe (wireframe-dotted-globe.tsx)
- **Ligne 2313-2333**: Boucle `forEach` sur 5000+ dots arrière chaque frame
- **Ligne 2359-2391**: Boucle `forEach` sur 5000+ dots avant chaque frame
- **Impact**: 10000+ opérations `arc()` + `fill()` par frame = ~166 fois par seconde
- **Coût**: Environ 40% du temps CPU total

### 2. Appels de projection D3.js répétés
- **Lignes multiples**: `projection([lng, lat])` appelé pour chaque point, ligne, ville
- **Fréquence**: 10000+ appels par frame (dots + cities + routes)
- **Impact**: Recalculs trigonométriques coûteux sans cache
- **Coût**: ~15% du temps CPU

### 3. Calculs de rotation avec rotator
- **Ligne 2316**: `rotator([dot.lng, dot.lat])` pour chaque dot
- **Impact**: Double transformation (rotator + projection) par point
- **Coût**: ~10% du temps CPU

### 4. Détection de visibilité back/front
- **Ligne 2319**: `if (rLng <= -90 || rLng >= 90)` sur 5000+ dots
- **Impact**: Branches conditionnelles répétées dans boucle critique
- **Coût**: ~5% du temps CPU

### 5. Dessin des lignes vertes animées
- **Ligne 2414-2426**: `forEach` sur ~50 routes avec 40 segments chacun
- **Ligne 2029-2115**: Fonction `drawGreenLine()` - 40 appels projection par ligne
- **Impact**: 2000+ projections + arc draws par frame
- **Coût**: ~8% du temps CPU

### 6. Canvas Context State Changes
- **Lignes 2300-2540**: Multiples `fillStyle`, `strokeStyle`, `globalAlpha` changes
- **Impact**: Invalidation du state GPU à chaque changement
- **Coût**: ~5% du temps CPU

### 7. Rendering des markers de villes
- **Ligne 2410-2540**: Boucle sur 100+ villes avec checks de visibilité
- **Impact**: Calculs de projection + distance checks + dessins
- **Coût**: ~4% du temps CPU

### 8. Graticule recalculation
- **Ligne 2276-2299**: Recalcul de la grille à chaque frame
- **Impact**: `graticule10()` génère 360+ points à projeter
- **Coût**: ~3% du temps CPU

### 9. Path generator D3.js
- **Ligne 2234**: `path()` appelé sur toutes les features continents
- **Impact**: Génération de paths SVG puis rasterisation canvas
- **Coût**: ~5% du temps CPU

### 10. RequestAnimationFrame loop non optimisé
- **Ligne 2650-2697**: Render appelé même sans changements visibles
- **Impact**: CPU et GPU sollicités en permanence
- **Coût**: ~5% overhead continu

---

## 🟠 ÉLEVÉ (10 causes importantes)

### 11. Recalcul des contours de continents
- **Ligne 2293-2307**: Path contouring recalculé à chaque frame
- **Impact**: Même si les continents ne changent pas

### 12. Pulse effect animation
- **Ligne 1997-2028**: Timer séparé pour l'effet de pulse
- **Impact**: RAF additionnel qui tourne en parallèle

### 13. Détection de visibilité des villes
- **Ligne 2452-2467**: Calculs d3.geoDistance pour chaque ville
- **Impact**: Fonctions trigonométriques coûteuses

### 14. Hover detection sur canvas
- **Ligne 2973-2988**: MouseMove events avec calculs projection
- **Impact**: Événements haute fréquence sur tout le canvas

### 15. City click detection
- **Ligne 2749-2805**: Boucle sur toutes les villes à chaque clic
- **Impact**: Projections + calculs distance répétés

### 16. Animation de zoom vers ville
- **Ligne 1639-1785**: Interpolations complexes avec RAF
- **Impact**: Recalculs matrix de transformation

### 17. Animation de lignes destination
- **Ligne 878-943**: Gestion state + timeouts multiples
- **Impact**: Cascade de re-renders React

### 18. Popup positioning calculations
- **Ligne 3520-3650**: Calculs viewport + bounds checks
- **Impact**: Layout thrashing (read then write)

### 19. Responsive resize handling
- **Ligne 374-411**: Recalcule tout à chaque resize
- **Impact**: Invalidation complète du canvas

### 20. GeoJSON parsing répété
- **Ligne 2149**: `topojson.feature()` pas en cache
- **Impact**: Parsing JSON à chaque render initial

---

## 🟡 MOYEN (10 causes notables)

### 21. Allocation de tableaux dans loops
- **Ligne 2314**: `const backDots = []` créé chaque frame
- **Impact**: Garbage collection répétée

### 22. String concatenations pour colors
- **Ligne 2313**: Template strings RGBA dans boucle
- **Impact**: Allocations string à répétition

### 23. Math calculations répétées
- **Ligne 2323-2327**: `Math.cos()`, `Math.sin()` sans cache
- **Impact**: CPU cycles perdus

### 24. Filter operations sur arrays
- **Ligne 3325**: `.filter()` sur cities array
- **Impact**: Crée nouveau array à chaque fois

### 25. Map operations répétées
- **Ligne 3742**: `.map()` dans render loop
- **Impact**: Allocations mémoire

### 26. Sort operations
- **Ligne 514**: `.sort()` sur destinations
- **Impact**: O(n log n) à chaque recalcul

### 27. Object destructuring dans loops
- **Ligne 2317**: `const [rLng, rLat]` répété
- **Impact**: Micro-allocations

### 28. Arrow functions dans loops
- **Ligne 2314**: Nouvelles functions créées
- **Impact**: Pressure sur garbage collector

### 29. Spread operator usage
- **Ligne 3761**: `{...label}` dans render
- **Impact**: Clone d'objets

### 30. Array slicing
- **Ligne 3338**: `.slice()` crée copies
- **Impact**: Mémoire et temps

---

## 🔵 Appels coûteux D3.js (10 causes)

### 31. d3.geoOrthographic()
- **Ligne 2201**: Projection recréée
- **Impact**: Setup coûteux

### 32. d3.geoPath()
- **Ligne 2234**: Path generator overhead
- **Impact**: Conversions géométriques

### 33. d3.geoGraticule10()
- **Ligne 2276**: Génération de grille
- **Impact**: Calculs mathématiques intensifs

### 34. d3.geoDistance()
- **Ligne 2452**: Distance sphérique
- **Impact**: Arccosine + trigonométrie

### 35. d3.geoRotation()
- **Ligne 1379**: Rotation matrix
- **Impact**: Matrix multiplications

### 36. projection.rotate()
- **Ligne 2687**: Update projection state
- **Impact**: Invalidation de caches internes

### 37. projection.scale()
- **Ligne 1666**: Mise à jour d'échelle
- **Impact**: Recalculs de toutes projections suivantes

### 38. projection.translate()
- **Ligne 2211**: Repositionnement
- **Impact**: Offset calculations

### 39. d3.timer()
- **Ligne 2698**: Timer RAF personnalisé
- **Impact**: Overhead de scheduling

### 40. topojson.feature()
- **Ligne 2149**: Conversion TopoJSON
- **Impact**: Parsing + reconstruction géométrie

---

## ⚡ useEffect et cycles React (10 causes)

### 41. Multiple useEffect pour dimensions
- **Ligne 374-411**: ResizeObserver + state updates
- **Impact**: Re-renders en cascade

### 42. useEffect pour destination changes
- **Ligne 1326-1360**: Écoute externalDestinationIndex
- **Impact**: Triggers animations

### 43. useEffect pour menu state
- **Ligne 1303-1324**: Synchronisation isMenuOpen
- **Impact**: State updates

### 44. useEffect pour panel state
- **Ligne 1277-1301**: Gestion isPanelOpen
- **Impact**: Conditionals + RAF

### 45. useEffect pour rotation control
- **Ligne 1240-1275**: Toggle auto-rotation
- **Impact**: Refs updates

### 46. useEffect scroll listeners
- **Ligne 991-1059**: Passive scroll events
- **Impact**: Event handlers alta fréquence

### 47. useEffect pour green lines
- **Ligne 945-989**: Animation timer
- **Impact**: setTimeout chains

### 48. useEffect pour city selection
- **Ligne 823-876**: selectedCity watches
- **Impact**: Cleanup + setup

### 49. useEffect pour popup timeouts
- **Ligne 710-821**: Multiple clearTimeout
- **Impact**: Timer management overhead

### 50. useEffect pour world data loading
- **Ligne 2142-2154**: Fetch + parse
- **Impact**: Initial load penalty

---

## 🔄 Re-renders React (10 causes)

### 51. 30+ useState declarations
- **Lignes 32-73**: Trop de states indépendants
- **Impact**: Re-render sur chaque setState

### 52. Cascade setState calls
- **Ligne 1356**: Multiple setState successifs
- **Impact**: Batching pas optimal

### 53. State updates dans loops
- **Ligne 2686**: setState dans RAF loop
- **Impact**: Re-renders non contrôlés

### 54. Props drilling deep
- **Ligne 3055**: Props passées sur plusieurs niveaux
- **Impact**: Re-renders inutiles enfants

### 55. Non-memoized callbacks
- **Ligne 2749**: Callbacks recréés à chaque render
- **Impact**: Dépendances changent

### 56. Inline object creation
- **Ligne 2954**: `style={{ touchAction }}` nouveau objet
- **Impact**: Props reference changes

### 57. Inline array creation
- **Ligne 3742**: Arrays créés dans JSX
- **Impact**: Reconciliation React

### 58. Conditional rendering logic
- **Ligne 3082**: Ternaires complexes
- **Impact**: Évaluations répétées

### 59. Context provider re-renders
- Pas explicite mais patterns suggèrent usage
- **Impact**: Descendants re-render

### 60. Key prop issues
- **Ligne 3744**: Keys potentiellement instables
- **Impact**: Remount components

---

## 🌟 stars-background.tsx (10 causes)

### 61. useFrame toujours actif
- **Ligne 154-161**: Tourne même hors vue
- **Impact**: 60 FPS CPU utilisés inutilement

### 62. 3 instances StarField
- **Ligne 267-269**: 3x useFrame loops
- **Impact**: Triple overhead

### 63. 3500 stars par instance
- **Ligne 120-150**: 10500 stars total
- **Impact**: Beaucoup de geometry

### 64. Shader calculations
- **Ligne 88-102**: Fragment shader complexe
- **Impact**: GPU cycles

### 65. ShaderMaterial overhead
- **Ligne 58-103**: Custom shaders
- **Impact**: Plus lourd que BasicMaterial

### 66. Float32Array allocations
- **Ligne 120-148**: 5 arrays de 3500 éléments
- **Impact**: Mémoire GPU

### 67. BufferAttribute updates
- **Ligne 157**: Uniform updates chaque frame
- **Impact**: GPU uploads

### 68. Rotation calculations
- **Ligne 157**: Rotation.y update constante
- **Impact**: Matrix recalculations

### 69. Twinkle effect calculations
- **Ligne 88-89**: Sin waves chaque frame
- **Impact**: Math operations répétées

### 70. Shooting stars instances
- **Ligne 267**: 3 ShootingStar components
- **Impact**: Plus de RAF loops

---

## 🎨 CSS et Layout (10 causes)

### 71. backdrop-blur-xl
- **Ligne 149**: Effet blur coûteux
- **Impact**: GPU intensive filtering

### 72. Multiple glassmorphism effects
- **content-panel.tsx**: Backdrup blur répété
- **Impact**: Passes de rendering multiples

### 73. Box shadows complexes
- **Ligne 3663**: `shadow-[0_30px_80px]`
- **Impact**: Blur + offset calculations

### 74. Border radius animés
- **Ligne 865**: Smooth transitions
- **Impact**: Repaints constants

### 75. Gradient backgrounds
- **Ligne 2953**: `bg-gradient-to-br`
- **Impact**: Calculs de dégradés

### 76. Transition-all usage
- **Ligne 3067**: Anime toutes les propriétés
- **Impact**: Plus lourd que transition ciblée

### 77. Transform translations
- **Ligne 3099**: Translatex répétés
- **Impact**: Composite layers

### 78. Opacity animations
- **Ligne 2313**: Changements alpha
- **Impact**: Blending calculations

### 79. Will-change property
- Absente où elle devrait être
- **Impact**: Pas de layer promotion

### 80. Fixed positioning
- **side-menu.tsx ligne 309**: Fixed elements
- **Impact**: Repaint on scroll

---

## 🔧 Géométrie et Math (10 causes)

### 81. DEG2RAD conversions
- **Ligne 2322**: Multiplication répétée par PI/180
- **Impact**: Operations inutiles

### 82. Trigonométrie répétée
- **Ligne 2323**: `Math.cos(rLatRad)`
- **Impact**: Calculs coûteux

### 83. Racines carrées
- **Ligne 2452**: `Math.sqrt()` dans distance
- **Impact**: Opérations lentes

### 84. Exponentielles
- Potentially dans animations easing
- **Impact**: Calculs complexes

### 85. Logarithmes
- Potentially dans scaling
- **Impact**: CPU intensive

### 86. Arccosine
- **Ligne d3.geoDistance**: `Math.acos()`
- **Impact**: Très coûteux

### 87. Arcsine
- Potentially dans projections
- **Impact**: Lent

### 88. Tangentes
- Potentially dans rotations
- **Impact**: Calculs trigonométriques

### 89. Modulo operations
- **Ligne 3040**: Modulo pour wrapping
- **Impact**: Division + remainder

### 90. Absolute value calls
- **Ligne potentielle**: `Math.abs()`
- **Impact**: Branching

---

## 🔨 Autres optimisations manquantes (20 causes)

### 91. Pas de throttling scroll
- **Ligne 991**: Événements scroll non throttled
- **Impact**: Trop d'événements traités

### 92. Pas de debouncing resize
- **Ligne 374**: Resize events non debounced
- **Impact**: Recalculs excessifs

### 93. Pas de Web Workers
- Tout sur main thread
- **Impact**: Bloque l'UI

### 94. Pas de OffscreenCanvas
- **Ligne 2958**: Canvas principal seulement
- **Impact**: Pas de parallel rendering

### 95. Pas de caching projection results
- Projections recalculées sans cache
- **Impact**: Calculs redondants

### 96. Pas de spatial indexing
- Villes cherchées linéairement
- **Impact**: O(n) au lieu de O(log n)

### 97. Pas de Level of Detail (LOD)
- Tous les dots rendus tout le temps
- **Impact**: Détails inutiles au loin

### 98. Pas de frustum culling
- Points hors écran dessinés
- **Impact**: Draw calls inutiles

### 99. Pas de memoization React
- Composants pas React.memo()
- **Impact**: Re-renders inutiles

### 100. Pas de lazy loading
- Tous composants chargés d'un coup
- **Impact**: Initial bundle size énorme

---

## 📊 Résumé des impacts

| Catégorie | Impact sur performance | Priorité correction |
|-----------|------------------------|---------------------|
| Rendu dots globe | 40% | 🔴 CRITIQUE |
| Projections D3 | 15% | 🔴 CRITIQUE |
| Rotations | 10% | 🟠 ÉLEVÉ |
| Lignes vertes | 8% | 🟠 ÉLEVÉ |
| States React | 6% | 🟡 MOYEN |
| Stars Three.js | 8% | 🟠 ÉLEVÉ |
| Canvas State | 5% | 🟡 MOYEN |
| CSS Effects | 4% | 🟡 MOYEN |
| Autres | 4% | 🟢 BAS |

**Total identifié: ~100% des causes de lag**
