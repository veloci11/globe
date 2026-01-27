'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export function ParallaxComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);

  useEffect(() => {
    // Reset complet du parallax
    const handleReset = () => {
      gsap.set('[data-parallax-layer="layer1"]', { y: 0 });
      gsap.set('[data-parallax-layer="layer2"]', { y: 0 });
      gsap.set('[data-parallax-layer="layer3"]', { y: 0 });
      gsap.set('[data-parallax-layer="title"]', { y: 0, opacity: 1, filter: 'blur(0px)' });
      gsap.set('[data-parallax-layer="gradient"]', { y: 0 });
      window.scrollTo(0, 0);
      hasAutoScrolled.current = false;
    };

    // Écouter l'événement de reset depuis le bouton Home
    window.addEventListener('resetParallax', handleReset);

    // Détection du scroll à 30% pour auto-scroll vers le globe (déclenché tôt)
    const handleScroll = () => {
      if (hasAutoScrolled.current) return;

      const scrollPosition = window.scrollY;
      const viewportHeight = window.innerHeight;

      // Seuil bas pour déclencher rapidement : 30% de la hauteur de l'écran
      const threshold = viewportHeight * 0.3;

      if (scrollPosition >= threshold) {
        hasAutoScrolled.current = true;

        // 🚀 OPTIMISÉ: Scroll automatique LENT et FLUIDE vers le globe
        gsap.to(window, {
          scrollTo: { y: viewportHeight, autoKill: false },
          duration: 2.0, // Plus lent pour éviter la téléportation
          ease: "power1.out", // Easing très doux et progressif
          onComplete: () => {
            // Ouvrir le menu automatiquement après le scroll
            setTimeout(() => {
              const event = new CustomEvent('openMenuAuto');
              window.dispatchEvent(event);
            }, 300);
          }
        });
      }
    };

    // Bloquer le scroll vers le haut une fois sur la page du globe
    const handleWheel = (e: WheelEvent) => {
      const viewportHeight = window.innerHeight;

      // Si on est sur la page du globe (scrollY >= 100vh) et qu'on scroll vers le haut
      if (window.scrollY >= viewportHeight && e.deltaY < 0) {
        e.preventDefault();
        // Forcer la position à 100vh
        window.scrollTo(0, viewportHeight);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false });

    // 🚀 OPTIMISÉ: Effet parallax progressif au scroll avec GPU acceleration
    // Layer 1 (premier plan) - bouge beaucoup
    gsap.to('[data-parallax-layer="layer1"]', {
      y: '-90vh',
      ease: 'none',
      force3D: true,
      willChange: 'transform',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5, // Plus doux (1.5 = rattrapage fluide)
        invalidateOnRefresh: true,
      }
    });

    // Layer 2 (milieu) - bouge moyennement
    gsap.to('[data-parallax-layer="layer2"]', {
      y: '-45vh',
      ease: 'none',
      force3D: true,
      willChange: 'transform',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5,
        invalidateOnRefresh: true,
      }
    });

    // Layer 3 (arrière-plan) - bouge dans le SENS OPPOSÉ très lentement
    gsap.to('[data-parallax-layer="layer3"]', {
      y: '+2vh',
      ease: 'none',
      force3D: true,
      willChange: 'transform',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5,
        invalidateOnRefresh: true,
      }
    });

    // Titre - disparaît progressivement (sans blur pour éviter les saccades)
    gsap.to('[data-parallax-layer="title"]', {
      y: '-50vh',
      opacity: 0,
      // 🚀 OPTIMISATION: Blur retiré car très coûteux en GPU et cause des saccades
      ease: 'none',
      force3D: true,
      willChange: 'transform, opacity',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5,
        invalidateOnRefresh: true,
      }
    });

    // Dégradé - bouge légèrement
    gsap.to('[data-parallax-layer="gradient"]', {
      y: '-8vh',
      ease: 'none',
      force3D: true,
      willChange: 'transform',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5,
        invalidateOnRefresh: true,
      }
    });

    // 🚀 PRÉ-CHAUFFAGE: Refresh ScrollTrigger pour calculer toutes les positions
    // Cela évite la saccade au premier scroll
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      // Simuler un micro-scroll pour pré-initialiser le pipeline
      window.scrollBy(0, 1);
      window.scrollBy(0, -1);
    });

    return () => {
      window.removeEventListener('resetParallax', handleReset);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-transparent overflow-hidden" ref={containerRef}>
      {/* ✨ Étoiles de TRANSITION (en dessous des layers, à partir de 50% de hauteur) */}
      <div
        className="absolute inset-0 z-[0] pointer-events-none"
        style={{
          background: `
            radial-gradient(1.5px 1.5px at 5% 50%, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 12% 55%, rgba(200,220,255,0.6), transparent),
            radial-gradient(1px 1px at 20% 52%, rgba(255,240,220,0.5), transparent),
            radial-gradient(1.5px 1.5px at 28% 58%, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 35% 53%, rgba(180,200,255,0.5), transparent),
            radial-gradient(1px 1px at 45% 60%, rgba(255,230,200,0.6), transparent),
            radial-gradient(1.5px 1.5px at 55% 54%, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 65% 62%, rgba(200,210,255,0.5), transparent),
            radial-gradient(1px 1px at 72% 56%, rgba(255,220,200,0.6), transparent),
            radial-gradient(1.5px 1.5px at 82% 58%, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 92% 55%, rgba(180,200,255,0.5), transparent),
            radial-gradient(1px 1px at 8% 65%, rgba(255,255,255,0.6), transparent),
            radial-gradient(1.5px 1.5px at 18% 72%, rgba(200,220,255,0.7), transparent),
            radial-gradient(1px 1px at 30% 68%, rgba(255,240,220,0.5), transparent),
            radial-gradient(1px 1px at 42% 75%, rgba(255,255,255,0.6), transparent),
            radial-gradient(1.5px 1.5px at 52% 70%, rgba(180,200,255,0.7), transparent),
            radial-gradient(1px 1px at 62% 78%, rgba(255,230,200,0.5), transparent),
            radial-gradient(1px 1px at 75% 72%, rgba(255,255,255,0.6), transparent),
            radial-gradient(1.5px 1.5px at 88% 76%, rgba(200,210,255,0.7), transparent),
            radial-gradient(1px 1px at 95% 68%, rgba(255,220,200,0.5), transparent),
            radial-gradient(1.5px 1.5px at 15% 82%, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 25% 88%, rgba(180,200,255,0.5), transparent),
            radial-gradient(1px 1px at 38% 85%, rgba(255,240,220,0.6), transparent),
            radial-gradient(1.5px 1.5px at 48% 90%, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 58% 86%, rgba(200,220,255,0.5), transparent),
            radial-gradient(1px 1px at 70% 92%, rgba(255,230,200,0.6), transparent),
            radial-gradient(1.5px 1.5px at 80% 88%, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 90% 95%, rgba(180,200,255,0.5), transparent),
            radial-gradient(2px 2px at 5% 98%, rgba(255,255,255,0.9), transparent),
            radial-gradient(2px 2px at 35% 97%, rgba(200,220,255,0.8), transparent),
            radial-gradient(2px 2px at 65% 99%, rgba(255,240,220,0.9), transparent),
            radial-gradient(2px 2px at 95% 96%, rgba(180,200,255,0.8), transparent)
          `,
          backgroundSize: '100% 100%',
        }}
      />
      {/* Layer 1 - Premier plan (bouge BEAUCOUP) avec son gradient intégré */}
      <div data-parallax-layer="layer1" className="absolute inset-0 z-[3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/layer1.webp"
          loading="eager"
          alt="Layer 1"
          className="absolute top-0 left-0 w-full h-full"
          style={{
            objectFit: 'cover',
            objectPosition: 'center center',
            // Masque pour adoucir le bord inférieur (fondu vers transparent)
            maskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)',
          }}
        />
        {/* Dégradé noir qui suit layer 1 */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: '85vh',
            background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.04) 10%, rgba(0,0,0,0.12) 20%, rgba(0,0,0,0.28) 35%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.94) 92%, black 100%)'
          }}
        />
      </div>

      {/* ✨ Étoiles derrière TOUT (z-0), luminosité augmentée */}
      <div
        className="absolute inset-0 z-[0] pointer-events-none"
        style={{
          background: `
            radial-gradient(2px 2px at 3% 45%, rgba(255,255,255,1), transparent),
            radial-gradient(1.5px 1.5px at 10% 55%, rgba(200,220,255,1), transparent),
            radial-gradient(2px 2px at 18% 48%, rgba(255,240,220,1), transparent),
            radial-gradient(1.5px 1.5px at 25% 62%, rgba(180,200,255,0.9), transparent),
            radial-gradient(1.5px 1.5px at 33% 52%, rgba(255,255,255,1), transparent),
            radial-gradient(2px 2px at 42% 58%, rgba(200,210,255,1), transparent),
            radial-gradient(1.5px 1.5px at 50% 45%, rgba(255,230,200,0.9), transparent),
            radial-gradient(1.5px 1.5px at 58% 65%, rgba(255,255,255,1), transparent),
            radial-gradient(2px 2px at 65% 50%, rgba(180,200,255,1), transparent),
            radial-gradient(1.5px 1.5px at 73% 60%, rgba(255,220,200,0.9), transparent),
            radial-gradient(2px 2px at 82% 48%, rgba(200,220,255,1), transparent),
            radial-gradient(1.5px 1.5px at 90% 55%, rgba(255,255,255,1), transparent),
            radial-gradient(1.5px 1.5px at 95% 62%, rgba(180,200,255,0.9), transparent),
            radial-gradient(2px 2px at 8% 72%, rgba(255,255,255,1), transparent),
            radial-gradient(1.5px 1.5px at 22% 78%, rgba(200,210,255,0.9), transparent),
            radial-gradient(1.5px 1.5px at 35% 70%, rgba(255,240,220,1), transparent),
            radial-gradient(2px 2px at 48% 82%, rgba(255,255,255,1), transparent),
            radial-gradient(1.5px 1.5px at 62% 75%, rgba(180,200,255,0.9), transparent),
            radial-gradient(1.5px 1.5px at 75% 85%, rgba(255,230,200,1), transparent),
            radial-gradient(2px 2px at 88% 78%, rgba(255,255,255,1), transparent),
            radial-gradient(3px 3px at 15% 92%, rgba(255,255,255,1), transparent),
            radial-gradient(3px 3px at 45% 95%, rgba(200,220,255,1), transparent),
            radial-gradient(3px 3px at 75% 90%, rgba(255,240,220,1), transparent)
          `,
          backgroundSize: '100% 100%',
        }}
      />

      {/* Layer 2 - Plan milieu (bouge moyennement) */}
      <div data-parallax-layer="layer2" className="absolute inset-0 z-[2]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/layer2.webp"
          loading="eager"
          alt="Layer 2"
          className="absolute top-0 left-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center center' }}
        />
      </div>

      {/* Layer 3 - Arrière-plan (ne bouge presque pas) */}
      <div data-parallax-layer="layer3" className="absolute inset-0 z-[1]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/layer3.webp"
          loading="eager"
          alt="Layer 3"
          className="absolute top-0 left-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center center' }}
        />
      </div>

      {/* Titre (bouge et disparaît) */}
      <div data-parallax-layer="title" className="absolute inset-0 flex items-center justify-center z-20">
        <div className="text-center relative">
          {/* Fond semi-transparent derrière le texte */}
          <div className="absolute inset-0 -inset-x-20 -inset-y-10 bg-black/40 blur-xl"></div>
          <h2 className="text-[10vw] md:text-8xl font-bold text-white tracking-[0.3em] drop-shadow-2xl relative z-10">
            MATHIS GIL
          </h2>
          <p className="text-white/70 mt-6 text-sm md:text-base tracking-[0.5em] animate-pulse">
            SCROLL POUR EXPLORER
          </p>
          {/* Dégradé noir sous le texte */}
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[140%] h-32 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)'
            }}
          />
        </div>
      </div>



      {/* ✨ Étoiles qui débordent sur le bas de layer 1 */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[15] pointer-events-none"
        style={{
          height: '25vh',
          background: `
            radial-gradient(1px 1px at 5% 60%, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 15% 80%, rgba(200,220,255,0.6), transparent),
            radial-gradient(1.5px 1.5px at 25% 70%, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 35% 90%, rgba(255,240,220,0.6), transparent),
            radial-gradient(1px 1px at 45% 65%, rgba(200,210,255,0.5), transparent),
            radial-gradient(1.5px 1.5px at 55% 85%, rgba(255,255,255,0.7), transparent),
            radial-gradient(1px 1px at 65% 75%, rgba(255,230,200,0.6), transparent),
            radial-gradient(1px 1px at 75% 95%, rgba(180,200,255,0.7), transparent),
            radial-gradient(1.5px 1.5px at 85% 72%, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 95% 88%, rgba(255,220,200,0.5), transparent)
          `,
          backgroundSize: '100% 100%',
          maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, black 100%)',
        }}
      />
    </div>
  );
}
