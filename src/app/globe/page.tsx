"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import SideMenu from "@/components/ui/side-menu"

const RotatingEarth = dynamic(() => import("@/components/ui/wireframe-dotted-globe"), {
  ssr: false,
})

export default function GlobePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(true)

  const menuItems = [
    { label: "Home", ariaLabel: "Go to home page", link: "/" },
    { label: "Globe", ariaLabel: "Explore the globe", link: "/globe" },
    { label: "About", ariaLabel: "Learn about me", link: "/about" },
    { label: "Projects", ariaLabel: "View my projects", link: "/projects" },
    { label: "Contact", ariaLabel: "Get in touch", link: "/contact" }
  ]

  const socialItems = [
    { label: "GitHub", link: "https://github.com" },
    { label: "LinkedIn", link: "https://linkedin.com" },
    { label: "Twitter", link: "https://twitter.com" }
  ]

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <SideMenu
        items={menuItems}
        socialItems={socialItems}
        displaySocials={true}
        displayItemNumbering={true}
        accentColor="#FF8700"
        isOpen={isMenuOpen}
        onMenuOpen={() => setIsMenuOpen(true)}
        onMenuClose={() => setIsMenuOpen(false)}
      />

      <RotatingEarth
        isMenuOpen={isMenuOpen}
        onMenuClose={() => setIsMenuOpen(false)}
      />
    </div>
  )
}
