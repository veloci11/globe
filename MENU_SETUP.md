# 📱 Configuration du Menu Latéral

## 🎯 Fonctionnalités

Le menu latéral possède les fonctionnalités suivantes :

### 1. **Ouverture/Fermeture du menu**
- Bouton en haut à droite avec icône hamburger/croix
- Animation fluide de glissement depuis la gauche
- Overlay sombre sur le reste de l'écran

### 2. **Décalage automatique du globe**
- Quand le menu s'ouvre, le globe se décale automatiquement vers la droite
- Le décalage est proportionnel à la largeur du menu (40% de l'écran, max 450px)
- Le globe reste entièrement visible à droite

### 3. **Reset automatique à l'ouverture**
- Si un point est zoomé, le globe fait un dezoom automatique
- Retour à la vue de base (overview)
- Toutes les popups se ferment
- La rotation automatique reprend

### 4. **Design glassmorphism**
- Fond semi-transparent avec effet de flou
- Gradient subtil pour un effet liquide
- Bordure lumineuse sur le côté droit

## 📝 Personnalisation

### Dans `/src/app/page.tsx` :

```tsx
const menuItems = [
  { label: "Home", ariaLabel: "Go to home page", link: "/" },
  { label: "About", ariaLabel: "Learn about me", link: "/about" },
  { label: "Projects", ariaLabel: "View my projects", link: "/projects" },
  { label: "Contact", ariaLabel: "Get in touch", link: "/contact" }
]

const socialItems = [
  { label: "GitHub", link: "https://github.com" },
  { label: "LinkedIn", link: "https://linkedin.com" },
  { label: "Twitter", link: "https://twitter.com" }
]
```

### Couleur d'accent

Changez la couleur verte par défaut :

```tsx
<SideMenu
  ...
  accentColor="#00ff00"  // Changez cette valeur (hex color)
  ...
/>
```

### Options disponibles

```tsx
<SideMenu
  items={menuItems}                      // Menu principal (requis)
  socialItems={socialItems}              // Liens sociaux (optionnel)
  displaySocials={true}                  // Afficher les liens sociaux
  displayItemNumbering={true}            // Afficher 01, 02, 03...
  logoUrl="/path/to/logo.svg"           // Logo personnalisé
  accentColor="#00ff00"                 // Couleur des accents
  onMenuOpen={() => console.log('open')} // Callback ouverture
  onMenuClose={() => console.log('close')} // Callback fermeture
  onMenuStateChange={setIsMenuOpen}     // Callback changement d'état
/>
```

## 🗑️ Suppression du menu

Pour supprimer complètement le menu :

1. Supprimez le fichier `/src/components/ui/side-menu.tsx`
2. Dans `/src/app/page.tsx`, remplacez le contenu par :

```tsx
import RotatingEarth from "@/components/ui/wireframe-dotted-globe"

export default function Home() {
  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <RotatingEarth />
    </div>
  )
}
```

3. Dans `/src/components/ui/wireframe-dotted-globe.tsx` :
   - Supprimez l'interface `RotatingEarthComponentProps`
   - Supprimez le paramètre `isMenuOpen` de la fonction
   - Supprimez le `useEffect` pour la gestion du menu (lignes ~533-600)
   - Dans le useEffect principal, supprimez les lignes de calcul du décalage du menu

## 🎨 Style du menu

Le menu utilise les classes Tailwind suivantes pour le design glassmorphism :

```css
/* Background principal */
bg-gradient-to-br from-white/15 via-white/10 to-white/5
backdrop-blur-xl
border-r border-white/20

/* Items de menu */
text-white hover:text-green-400
text-4xl sm:text-5xl font-bold uppercase

/* Bouton menu */
bg-black/40 backdrop-blur-md hover:bg-black/60
border border-white/20
```

Pour un effet plus "liquide", vous pouvez ajuster les valeurs d'opacité et de blur.

## 📱 Responsive

Le menu s'adapte automatiquement :
- **Desktop** : Largeur de 40% (max 450px)
- **Tablette** : Largeur de 100%
- **Mobile** : Plein écran avec texte adapté

## 🔧 Prochaines étapes suggérées

1. **Intégrer MetallicPaint** pour le logo (si souhaité)
2. **Ajouter des routes Next.js** pour les liens du menu
3. **Personnaliser les animations** (durées, easings)
4. **Ajouter plus de liens sociaux**

## ⚠️ Notes importantes

- Le globe se décale uniquement visuellement (la projection est recalculée)
- L'animation de reset prend ~800ms
- Le menu bloque temporairement les interactions avec le globe pendant l'ouverture
- Les popups existantes se ferment automatiquement à l'ouverture du menu
