"use client"

import { useEffect, useRef, useState } from "react"

export function ParallaxHome() {
  const [scrollY, setScrollY] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Forcer scroll en haut au mount
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const relativeScroll = Math.max(0, -rect.top)
        setScrollY(relativeScroll)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Calculer les transformations pour chaque couche (vitesses différentes)
  const backgroundY = scrollY * 0.5
  const middleY = scrollY * 0.8

  // Opacité qui diminue en scrollant - DISPARAÎT VITE (300px au lieu de 600px)
  const opacity = Math.max(0, 1 - scrollY / 300)

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden"
    >
      {/* Couche de fond - Image d'arrière-plan */}
      <div
        className="absolute inset-0 z-0"
        style={{
          transform: `translateY(${backgroundY}px)`,
          willChange: 'transform'
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80"
          alt="Background mountains"
          className="w-full h-full object-cover"
        />
        {/* Gradient noir vers le bas pour transition fluide */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
      </div>

      {/* Couche du milieu - Titre principal */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center"
        style={{
          transform: `translateY(${middleY}px)`,
          opacity: opacity,
          willChange: 'transform, opacity'
        }}
      >
        <div className="text-center">
          <h1 className="text-7xl md:text-9xl font-bold text-white tracking-wider">
            MATHIS GIL
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mt-4 tracking-wide">
            Full Stack Developer & World Explorer
          </p>
        </div>
      </div>

      {/* Indicateur de scroll */}
      <div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center gap-2"
        style={{ opacity: opacity }}
      >
        <span className="text-white text-sm tracking-wider">SCROLL DOWN</span>
        <div className="w-6 h-10 border-2 border-white rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-white rounded-full animate-bounce" />
        </div>
      </div>

      {/* Transition finale vers le noir complet - PLUS GRANDE pour meilleure transition */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent via-black/80 to-black z-5" />
    </div>
  )
}
