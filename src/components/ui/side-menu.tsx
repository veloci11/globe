"use client"

import { useState, useEffect, useRef } from "react"
import { X, Menu, Linkedin } from "lucide-react"

interface SubMenuItem {
  label: string
  ariaLabel: string
  link?: string
  onClick?: () => void
  shouldCloseMenu?: boolean
}

interface MenuItem {
  label: string
  ariaLabel: string
  link?: string
  onClick?: () => void
  subItems?: SubMenuItem[]
}

interface SocialItem {
  label: string
  link: string
}

interface SideMenuProps {
  items: MenuItem[]
  socialItems?: SocialItem[]
  displaySocials?: boolean
  displayItemNumbering?: boolean
  accentColor?: string
  isOpen?: boolean
  onMenuOpen?: () => void
  onMenuClose?: () => void
  onMenuStateChange?: (isOpen: boolean) => void
}

export default function SideMenu({
  items,
  socialItems = [],
  displaySocials = true,
  displayItemNumbering = true,
  accentColor = "#FF8700",
  isOpen: controlledIsOpen,
  onMenuOpen,
  onMenuClose,
  onMenuStateChange
}: Readonly<SideMenuProps>) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null)
  const [subMenuPosition, setSubMenuPosition] = useState<number>(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const savedScrollPosition = useRef<number>(0)

  // Utiliser la prop controlledIsOpen si fournie, sinon l'état interne
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen

  useEffect(() => {
    if (onMenuStateChange) {
      onMenuStateChange(isOpen)
    }
    // Fermer les sous-menus quand le menu principal se ferme
    if (!isOpen) {
      setActiveSubMenu(null)
      // Sauvegarder la position du scroll
      if (scrollContainerRef.current) {
        savedScrollPosition.current = scrollContainerRef.current.scrollTop
      }
    } else {
      // Restaurer la position du scroll après un court délai pour permettre au menu de s'animer
      setTimeout(() => {
        if (scrollContainerRef.current && savedScrollPosition.current > 0) {
          scrollContainerRef.current.scrollTop = savedScrollPosition.current
        }
      }, 100)
    }
  }, [isOpen, onMenuStateChange])

  const toggleMenu = () => {
    if (isAnimating) return

    setIsAnimating(true)
    const newState = !isOpen

    // Si on utilise un état contrôlé, appeler les callbacks
    // Sinon, utiliser l'état interne
    if (controlledIsOpen !== undefined) {
      if (newState) {
        onMenuOpen?.()
      } else {
        onMenuClose?.()
      }
    } else {
      setInternalIsOpen(newState)
      if (newState) {
        onMenuOpen?.()
      } else {
        onMenuClose?.()
      }
    }

    setTimeout(() => setIsAnimating(false), 600)
  }

  return (
    <>
      {/* HEADER - Bouton Menu en haut à gauche */}
      <div className="fixed top-0 left-0 z-50 pointer-events-none">
        <div className="p-6 md:p-8">
          {/* BOUTON MENU (en haut à gauche) */}
          <button
            onClick={toggleMenu}
            className={`cursor-pointer pointer-events-auto flex items-center gap-2 bg-black/40 hover:bg-black/60 text-white px-4 py-2 rounded-full transition-all duration-300 border border-orange-500/30 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            aria-label="Open menu"
            title="Menu Button"
          >
            <div className="relative w-5 h-5">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium hidden sm:inline">
              Menu
            </span>
          </button>
        </div>
      </div>

      {/* OVERLAY - Désactivé, la fermeture se fait via le canvas du globe */}
      <div className="hidden" />

      {/* SOUS-MENUS - Desktop: flottants, Mobile: inline compact */}
      {activeSubMenu && items.find(item => item.label === activeSubMenu)?.subItems && (
        <>
          {/* Desktop version */}
          <div
            className="fixed left-[clamp(280px,40vw,450px)] z-[10000] pl-8 hidden md:block"
            style={{
              top: `${subMenuPosition}px`,
              animation: 'slideInFromRight 0.4s ease-out'
            }}
          >
            <div className="flex flex-col gap-4">
              {items.find(item => item.label === activeSubMenu)?.subItems?.map((subItem, subIndex) => {
                const SubElement = subItem.onClick ? 'button' : 'a'
                const shouldCloseMenu = subItem.shouldCloseMenu !== false
                const subProps = subItem.onClick
                  ? { onClick: () => { subItem.onClick?.(); if (shouldCloseMenu) { onMenuClose?.(); } } }
                  : { href: subItem.link }

                return (
                  <SubElement
                    key={`submenu-d-${subItem.label}-${subIndex}`}
                    {...subProps}
                    aria-label={subItem.ariaLabel}
                    className="cursor-pointer group relative px-8 py-6 rounded-3xl bg-gradient-to-br from-white/15 via-white/10 to-white/5 hover:from-white/25 hover:via-white/20 hover:to-white/10 backdrop-blur-md border border-white/30 hover:border-orange-500/70 transition-colors duration-200 text-left min-w-[280px]"
                    style={{
                      animation: `slideInFromRight 0.4s ease-out ${subIndex * 0.08}s backwards`
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-3 h-3 rounded-full opacity-70 group-hover:opacity-100 group-hover:shadow-[0_0_10px_currentColor] transition-all"
                          style={{ backgroundColor: accentColor }}
                        />
                        <span className="text-2xl font-bold text-white/90 group-hover:text-white transition-colors">
                          {subItem.label}
                        </span>
                      </div>
                      <svg
                        className="w-5 h-5 text-orange-500/70 group-hover:text-orange-500 group-hover:translate-x-1 transition-all"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </SubElement>
                )
              })}
            </div>
          </div>

          {/* Mobile version - design simple */}
          <div
            className="fixed left-2 right-2 z-[10000] md:hidden"
            style={{
              top: `${Math.min(subMenuPosition + 40, 350)}px`,
              animation: 'slideInFromRight 0.4s ease-out'
            }}
          >
            <div className="flex flex-col gap-3">
              {items.find(item => item.label === activeSubMenu)?.subItems?.map((subItem, subIndex) => {
                const SubElement = subItem.onClick ? 'button' : 'a'
                const shouldCloseMenu = subItem.shouldCloseMenu !== false
                const subProps = subItem.onClick
                  ? { onClick: () => { subItem.onClick?.(); if (shouldCloseMenu) { onMenuClose?.(); } } }
                  : { href: subItem.link }

                return (
                  <SubElement
                    key={`submenu-m-${subItem.label}-${subIndex}`}
                    {...subProps}
                    aria-label={subItem.ariaLabel}
                    className="cursor-pointer group relative px-6 py-4 rounded-2xl bg-gradient-to-br from-white/15 via-white/10 to-white/5 hover:from-white/25 hover:via-white/20 hover:to-white/10 backdrop-blur-md border border-white/30 hover:border-orange-500/70 transition-colors duration-200 text-left"
                    style={{
                      animation: `slideInFromRight 0.4s ease-out ${subIndex * 0.08}s backwards`
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full opacity-70 group-hover:opacity-100 group-hover:shadow-[0_0_10px_currentColor] transition-all"
                          style={{ backgroundColor: accentColor }}
                        />
                        <span className="text-lg font-bold text-white/90 group-hover:text-white transition-colors">
                          {subItem.label}
                        </span>
                      </div>
                      <svg
                        className="w-4 h-4 text-orange-500/70 group-hover:text-orange-500 group-hover:translate-x-1 transition-all"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </SubElement>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* PANEL MENU - Container principal du menu */}
      <nav
        className={`fixed top-0 left-0 h-full z-[9999] transition-transform duration-500 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        style={{
          width: "clamp(280px, 40vw, 450px)",
          maxWidth: "100vw"
        }}
        title="Menu Panel"
      >
        {/* BACKGROUND - Fond glassmorphism avec gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-md border-r border-white/20" onClick={(e) => e.stopPropagation()} />

        {/* Bouton de fermeture - EN DEHORS du conteneur de contenu pour éviter les conflits de hitbox */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            toggleMenu()
          }}
          className="cursor-pointer absolute top-5 right-5 z-[100] inline-flex h-12 w-12 items-center justify-center text-white/70 hover:text-white transition-colors duration-200"
          aria-label="Close menu"
          title="Close Menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* CONTENU - Zone de contenu du menu */}
        <div ref={scrollContainerRef} className="relative h-full flex flex-col p-4 sm:p-6 md:p-8 pt-20 sm:pt-24 overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>

          {/* NAVIGATION - Liste des liens principaux */}
          <nav className="flex-1">
            <ul className="flex flex-col gap-3">
              {items.map((item, index) => {
                const hasSubMenu = item.subItems && item.subItems.length > 0
                const isActive = activeSubMenu === item.label
                const ItemElement = item.onClick || hasSubMenu ? 'button' : 'a'

                const handleSubMenuClick = (e: React.MouseEvent<HTMLElement>) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setSubMenuPosition(rect.top)
                  setActiveSubMenu(isActive ? null : item.label)
                }

                const itemProps = hasSubMenu
                  ? { onClick: handleSubMenuClick }
                  : item.onClick
                    ? { onClick: () => { item.onClick?.(); onMenuClose?.(); } }
                    : { href: item.link }

                return (
                  <li
                    key={`menu-item-${item.link || item.label}-${index}`}
                    className="relative overflow-hidden"
                    style={{
                      opacity: isOpen ? 1 : 0,
                      transform: isOpen ? "translateX(0)" : "translateX(-20px)",
                      transition: `all 0.5s ease ${index * 0.1}s`
                    }}
                  >
                    <ItemElement
                      {...itemProps}
                      aria-label={item.ariaLabel}
                      className={`cursor-pointer group relative block text-white transition-all duration-300 w-full text-left ${isActive ? 'text-orange-500' : 'hover:text-orange-500'
                        }`}
                      title={`Menu Link: ${item.label}`}
                    >
                      <div className="flex items-baseline gap-4">
                        {/* NUMBERING - Numérotation 01, 02, 03... */}
                        {displayItemNumbering && (
                          <span
                            className="text-sm font-mono opacity-50 group-hover:opacity-100 transition-opacity"
                            style={{ color: accentColor }}
                            title="Item Number"
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        )}
                        {/* LABEL - Texte du lien */}
                        <span className="text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight leading-none break-words">
                          {item.label}
                        </span>
                      </div>

                      {/* UNDERLINE - Ligne de soulignement animée */}
                      <div
                        className={`absolute bottom-0 left-0 h-0.5 transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'
                          }`}
                        style={{ backgroundColor: accentColor }}
                        title="Hover Underline"
                      />
                    </ItemElement>


                  </li>
                )
              })}
            </ul>
          </nav>

          {/* SOCIALS - Section des liens sociaux (bas du menu) */}
          {displaySocials && socialItems.length > 0 && (
            <div
              className="mt-auto pt-8 border-t border-white/20"
              style={{
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.5s ease 0.4s"
              }}
              title="Social Links Section"
            >
              <div className="flex flex-col items-start gap-3">
                <div className="flex items-center gap-2 text-white/70">
                  <a
                    href="https://www.linkedin.com/in/gil-mathis"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Visit my LinkedIn profile"
                    className="cursor-pointer flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 transition hover:border-orange-400 hover:bg-white/10 hover:text-orange-200"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                  {/* Instagram link - commented out for now
                  <a
                    href="https://www.instagram.com/mathis_gil_"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Visit my Instagram profile"
                    className="cursor-pointer flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 transition hover:border-orange-400 hover:bg-white/10 hover:text-orange-200"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                  */}
                </div>
                <a
                  href="/GIL_Mathis_Resume.pdf"
                  download
                  className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white transition hover:border-orange-400 hover:bg-white/15 hover:text-orange-200"
                >
                  Download my resume
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}
