# 📋 Guide des Noms des Composants du Menu

## 🎯 Vue d'ensemble

Voici tous les éléments du menu avec leurs noms pour faciliter la communication :

---

## 📁 **Fichier : `side-menu.tsx`**

### 1️⃣ **HEADER** - En haut à gauche
```tsx
// BOUTON MENU (Hamburger/Croix)
- Position : Haut gauche
- Contient : Icône + Texte "Menu"/"Close"
- Classes : bg-black/40, rounded-full, border
```

### 2️⃣ **OVERLAY** - Fond sombre (DÉSACTIVÉ)
```tsx
// OVERLAY - Fond noir semi-transparent (actuellement masqué)
- Position : Plein écran derrière le menu
- État actuel : **DÉSACTIVÉ** (hidden)
- Note : Peut être réactivé en enlevant la classe "hidden"
```

### 3️⃣ **PANEL MENU** - Container principal
```tsx
// PANEL MENU - Le panneau qui glisse depuis la gauche
- Position : Gauche de l'écran
- Largeur : 280px à 450px (responsive)
- Animation : Slide depuis la gauche (translate-x)
```

### 4️⃣ **BACKGROUND** - Fond du panel
```tsx
// BACKGROUND - Fond glassmorphism
- Gradient : from-white/15 via-white/10 to-white/5
- Effet : backdrop-blur-xl (flou d'arrière-plan)
- Bordure : border-r border-white/20 (bordure droite)
```

### 5️⃣ **CONTENU** - Zone de contenu
```tsx
// CONTENU - Container du contenu du menu
- Padding : p-8, pt-24
- Scroll : overflow-y-auto
```

### 6️⃣ **NAVIGATION** - Liste des liens
```tsx
// NAVIGATION - Section des liens principaux
- Structure : <nav> contenant <ul>
- Gap : gap-3 entre les items
```

### 7️⃣ **ITEM** - Chaque lien du menu
```tsx
// ITEM - Un lien du menu
Composé de :
  - NUMBERING : Numéro (01, 02, 03...)
    * Couleur : accentColor (défaut #00ff00)
    * Taille : text-sm
    * Font : font-mono
  
  - LABEL : Texte du lien
    * Taille : text-4xl sm:text-5xl
    * Style : font-bold, uppercase
    * Couleur : text-white hover:text-green-400
  
  - UNDERLINE : Ligne de soulignement
    * Apparaît au hover
    * Animation : w-0 → w-full
    * Couleur : accentColor
```

### 8️⃣ **SOCIALS** - Section sociale (bas)
```tsx
// SOCIALS - Section des liens sociaux
Composé de :
  - SOCIALS TITLE : Titre "Follow"
    * Couleur : accentColor
    * Style : text-sm, uppercase
  
  - SOCIALS LIST : Liste des liens
    * Layout : flex, gap-4
    * Liens : GitHub, LinkedIn, Twitter...
```

---

## 🎨 **Variables de Style**

### Couleur d'accent (`accentColor`)
- **Défaut** : `#FF8700` (orange McLaren 🧡)
- **Utilisé pour** :
  - Numbering (01, 02, 03...)
  - Titre "Follow"
  - Ligne de soulignement au hover
  - Hover des liens (text-orange-500)

### Largeur du menu
```css
width: clamp(280px, 40vw, 450px)
```
- Minimum : 280px
- Par défaut : 40% de la largeur d'écran
- Maximum : 450px

---

## 📁 **Fichier : `wireframe-dotted-globe.tsx`**

### DÉCALAGE DE LA VUE (PROJECTION)
```tsx
// Dans le useEffect principal - Création de la projection
const menuWidth = isMenuOpen ? Math.min(450, containerWidth * 0.4) : 0
const viewOffsetX = isMenuOpen ? menuWidth / 2 : 0

const projection = d3
  .geoOrthographic()
  .scale(radius)
  .translate([containerWidth / 2 + viewOffsetX, containerHeight / 2])
  //                            ↑ Décalage du centre X
```

```tsx
// useEffect de gestion du menu - Animation du décalage
useEffect(() => {
  // Animation smooth de 500ms
  // Interpole entre position actuelle et nouvelle position
  // Le globe reste TOUJOURS cliquable
}, [isMenuOpen])
```

**Comment ça marche :**
- Quand `isMenuOpen = true` :
  - Calcul de la largeur du menu
  - Décalage = largeur menu ÷ 2
  - **Modification de la projection.translate()** (pas de reload !)
  - Animation smooth de 500ms
  
- Résultat : 
  - Le globe se décale visuellement vers la droite
  - Le globe reste **100% cliquable** et interactif
  - Pas de rechargement du globe

---

## 🗣️ **Vocabulaire pour communiquer**

Utilisez ces termes pour me guider :

| Ce que vous dites | Ce que je comprends |
|-------------------|---------------------|
| "Le bouton menu" | BOUTON MENU (haut gauche) |
| "Le fond noir" | OVERLAY |
| "Le panneau" | PANEL MENU |
| "Les numéros 01, 02..." | NUMBERING |
| "Les gros textes" | LABEL |
| "La ligne qui apparaît" | UNDERLINE |
| "Le bas du menu" | SOCIALS |
| "Le titre Follow" | SOCIALS TITLE |
| "Le fond du panel" | BACKGROUND |

---

## 📊 **Structure hiérarchique**

```
HEADER (top-left)
  └─ BOUTON MENU

OVERLAY (fullscreen)

PANEL MENU (left)
  └─ BACKGROUND (glassmorphism)
  └─ CONTENU
      ├─ NAVIGATION
      │   └─ ITEM (répété)
      │       ├─ NUMBERING
      │       ├─ LABEL
      │       └─ UNDERLINE
      │
      └─ SOCIALS
          ├─ SOCIALS TITLE
          └─ SOCIALS LIST
```

---

## 🎯 **États du menu**

| État | Description | Classes CSS |
|------|-------------|-------------|
| **Fermé** | Menu hors écran | `translate-x-full` |
| **Ouvert** | Menu visible | `translate-x-0` |
| **Hover item** | Survol d'un lien | `hover:text-green-400` |
| **Hover underline** | Ligne apparaît | `hover:w-full` |

---

## 🔧 **Comment modifier**

### Changer la couleur d'accent
```tsx
// Dans page.tsx
<SideMenu accentColor="#ff0000" />  // Rouge
```

### Changer la largeur du menu
```tsx
// Dans side-menu.tsx, ligne ~115
style={{ width: "clamp(280px, 40vw, 450px)" }}
//                      ^min   ^%   ^max
```

### Désactiver le numbering
```tsx
// Dans page.tsx
<SideMenu displayItemNumbering={false} />
```

### Masquer les socials
```tsx
// Dans page.tsx
<SideMenu displaySocials={false} />
```

---

## 📱 **Responsive**

| Écran | Comportement |
|-------|--------------|
| **Desktop** | Menu 40% largeur, max 450px |
| **Tablette** | Menu 40% largeur, max 450px |
| **Mobile** | Menu plein écran (100%) |

---

Utilisez ce guide pour me dire exactement ce que vous voulez modifier ! 🚀
