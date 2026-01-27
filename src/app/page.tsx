'use client';

import Image from "next/image";
import { ParallaxComponent } from '@/components/ui/parallax-scrolling';
import { useState, useEffect, useRef, useCallback } from 'react';
import emailjs from '@emailjs/browser';

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement,
        parameters: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: string;
        }
      ) => number;
      reset: (widgetId?: number) => void;
    };
  }
}
import RotatingEarth from "@/components/ui/wireframe-dotted-globe";
import SideMenu from "@/components/ui/side-menu";
import StarsBackground from "@/components/ui/stars-background";
import { ContentPanel, MyselfContent, MyJourneyContent, MyTimelineContent, MyFutureGoalsContent, PerProjectContent, ScientificResearchContent, InternationalExperienceContent } from "@/components/ui/content-panel";

type ContactOverlay = 'whatsapp' | 'wechat' | 'kakao' | 'email';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const isOnGlobe = useRef(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const externalDestinationIndexRef = useRef<number | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<ContactOverlay | null>(null);
  const [emailForm, setEmailForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [isRecaptchaReady, setIsRecaptchaReady] = useState(false);

  const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'aVdi1VEWS2Ejjm-6Y';
  const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_ykv7i6q';
  const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_l816wmo';
  const EMAILJS_AUTOREPLY_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_AUTOREPLY_TEMPLATE_ID || 'template_ykjoyqr';
  const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LcIuvErAAAAAIbISi4COvLI1QA-5dC-BZ78Jt1q';

  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaWidgetId = useRef<number | null>(null);
  const isEmailOverlayOpenRef = useRef(false);

  const resetRecaptcha = useCallback((options?: { release?: boolean }) => {
    const shouldRelease = options?.release ?? false;

    try {
      if (typeof window !== 'undefined' && window.grecaptcha && recaptchaWidgetId.current !== null) {
        window.grecaptcha.reset(recaptchaWidgetId.current);
      }
    } catch (error) {
      console.warn('Failed to reset reCAPTCHA widget', error);
    }

    if (shouldRelease) {
      if (recaptchaContainerRef.current) {
        recaptchaContainerRef.current.innerHTML = '';
      }
      recaptchaWidgetId.current = null;
    }

    setRecaptchaToken('');
  }, []);

  const closeOverlay = useCallback(() => {
    if (activeOverlay === 'email') {
      resetRecaptcha();
      setEmailStatus('idle');
      setEmailError(null);
    }
    isEmailOverlayOpenRef.current = false;
    setActiveOverlay(null);
  }, [activeOverlay, resetRecaptcha]);

  const openOverlay = useCallback((overlay: ContactOverlay) => {
    if (overlay === activeOverlay) {
      return;
    }

    if (activeOverlay === 'email' && overlay !== 'email') {
      resetRecaptcha();
      setEmailStatus('idle');
      setEmailError(null);
      isEmailOverlayOpenRef.current = false;
    }

    if (overlay === 'email') {
      setEmailStatus('idle');
      setEmailError(null);
      isEmailOverlayOpenRef.current = true;
    } else {
      isEmailOverlayOpenRef.current = false;
    }

    setActiveOverlay(overlay);
  }, [activeOverlay, resetRecaptcha]);

  const sanitizeInput = (value: string) =>
    value
      .replace(/[<>]/g, '')
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
      .slice(0, 5000);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = sanitizeInput(emailForm.name);
    const replyTo = sanitizeInput(emailForm.email);
    const subject = sanitizeInput(emailForm.subject);
    const message = sanitizeInput(emailForm.message);

    if (!isRecaptchaReady || !recaptchaToken) {
      setEmailStatus('error');
      setEmailError('Please confirm you are not a robot.');
      return;
    }

    setEmailStatus('loading');
    setEmailError(null);

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          name,
          email: replyTo,
          subject,
          message,
          'g-recaptcha-response': recaptchaToken,
        }
      );

      if (EMAILJS_AUTOREPLY_TEMPLATE_ID) {
        try {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_AUTOREPLY_TEMPLATE_ID,
            {
              name,
              email: replyTo,
              subject,
              message,
            }
          );
        } catch (autoReplyError) {
          console.warn('EmailJS auto-reply error', autoReplyError);
        }
      }

      setEmailStatus('success');
      setEmailForm({ name: '', email: '', subject: '', message: '' });
      resetRecaptcha();
    } catch (error) {
      if (!isEmailOverlayOpenRef.current) {
        setEmailStatus('idle');
        setEmailError(null);
        return;
      }

      console.error('EmailJS error', error);
      const fallbackMessage = 'Unable to send your message at the moment. Please try again or email me directly.';
      const detailedError = (error as { text?: string; message?: string })?.text || (error as { text?: string; message?: string })?.message;
      setEmailStatus('error');
      setEmailError(detailedError || fallbackMessage);
    }
  };

  const handleHomeClick = () => {
    // Fermer le menu avant de partir
    setShowMenu(false);
    setIsMenuOpen(false);
    isOnGlobe.current = false;
    closeOverlay();
    // Scroll instantané vers le haut
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Déclencher un événement pour réinitialiser le parallax
    window.dispatchEvent(new CustomEvent('resetParallax'));
  };

  useEffect(() => {
    // Toujours démarrer en haut (sur le parallax)
    window.scrollTo({ top: 0, behavior: 'instant' });

    const handleScroll = () => {
      // Utiliser un seuil plus bas pour mobile (barre d'adresse dynamique)
      const threshold = window.innerHeight * 0.9;

      // Quand on arrive proche du globe (90% de innerHeight pour compatibilité mobile)
      if (window.scrollY >= threshold) {
        // Verrouiller le scroll (pas de retour possible)
        if (!isOnGlobe.current) {
          isOnGlobe.current = true;
          window.scrollTo({ top: window.innerHeight, behavior: 'instant' });
        }
        // Afficher et ouvrir le menu immédiatement
        setShowMenu(true);
        setIsMenuOpen(true);
      } else if (isOnGlobe.current) {
        // BLOQUER LE RETOUR: si on est sur le globe et on essaie de remonter, forcer la position
        window.scrollTo({ top: window.innerHeight, behavior: 'instant' });
      } else {
        // Sur le parallax : menu caché et fermé
        setShowMenu(false);
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Vérification initiale au cas où la page charge déjà scrollée
    setTimeout(handleScroll, 100);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Initialise EmailJS avec la clé publique pour de meilleures erreurs
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }, [EMAILJS_PUBLIC_KEY]);

  useEffect(() => {
    // Écouter l'événement d'ouverture automatique du menu
    const handleOpenMenuAuto = () => {
      setIsMenuOpen(true);
    };

    window.addEventListener('openMenuAuto', handleOpenMenuAuto);

    return () => {
      window.removeEventListener('openMenuAuto', handleOpenMenuAuto);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.grecaptcha) {
      setIsRecaptchaReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.google.com/recaptcha/api.js?render=explicit"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsRecaptchaReady(true), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => setIsRecaptchaReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    isEmailOverlayOpenRef.current = activeOverlay === 'email';

    if (activeOverlay !== 'email') {
      return;
    }

    setEmailStatus('idle');
    setEmailError(null);

    if (
      isRecaptchaReady &&
      typeof window !== 'undefined' &&
      window.grecaptcha &&
      recaptchaContainerRef.current &&
      recaptchaWidgetId.current === null
    ) {
      recaptchaWidgetId.current = window.grecaptcha.render(recaptchaContainerRef.current, {
        sitekey: RECAPTCHA_SITE_KEY,
        callback: (token: string) => {
          if (!isEmailOverlayOpenRef.current) {
            return;
          }
          if (token === 'timeout-or-duplicate') {
            resetRecaptcha();
            setEmailStatus('error');
            setEmailError('Captcha timed out. Please verify again.');
            return;
          }
          setRecaptchaToken(token);
          setEmailError(null);
        },
        'expired-callback': () => {
          if (!isEmailOverlayOpenRef.current) {
            return;
          }
          setRecaptchaToken('');
          setEmailStatus('error');
          setEmailError('Captcha expired. Please verify again.');
        },
        'error-callback': () => {
          if (!isEmailOverlayOpenRef.current) {
            return;
          }
          setRecaptchaToken('');
          setEmailStatus('error');
          setEmailError('Captcha failed to load. Please try again.');
        },
      });
    }

    return () => {
      resetRecaptcha();
    };
  }, [activeOverlay, isRecaptchaReady, resetRecaptcha]);

  useEffect(() => {
    return () => {
      resetRecaptcha({ release: true });
    };
  }, [resetRecaptcha, RECAPTCHA_SITE_KEY]);

  const menuItems = [
    {
      label: "Home",
      ariaLabel: "Go to home page",
      link: "/",
      onClick: handleHomeClick
    },
    {
      label: "About",
      ariaLabel: "Learn about me",
      link: "/about",
      subItems: [
        {
          label: "Myself",
          ariaLabel: "Learn more about myself",
          onClick: () => {
            closeOverlay();
            setActivePanel('myself');
            setIsMenuOpen(false); // Fermer le menu quand on ouvre le panneau
          }
        },
        {
          label: "My Journey",
          ariaLabel: "Explore my academic journey",
          onClick: () => {
            closeOverlay();
            setActivePanel('journey');
            setIsMenuOpen(false); // Fermer le menu quand on ouvre le panneau
          }
        },
        {
          label: "My Timeline",
          ariaLabel: "View my timeline",
          onClick: () => {
            closeOverlay();
            setActivePanel('timeline');
            setIsMenuOpen(false);
          }
        },
        {
          label: "My Future Goals",
          ariaLabel: "View my future goals",
          onClick: () => {
            closeOverlay();
            setActivePanel('future');
            setIsMenuOpen(false);
          }
        }
      ]
    },
    {
      label: "Projects",
      ariaLabel: "View my projects",
      link: "/projects",
      subItems: [
        {
          label: "P.E.R",
          ariaLabel: "P.E.R project",
          onClick: () => {
            closeOverlay();
            setActivePanel('per');
            setIsMenuOpen(false);
          }
        },
        {
          label: "Scientific Research",
          ariaLabel: "Scientific research",
          onClick: () => {
            closeOverlay();
            setActivePanel('research');
            setIsMenuOpen(false);
          }
        },
        {
          label: "International Experience",
          ariaLabel: "International experience",
          onClick: () => {
            closeOverlay();
            setActivePanel('international');
            setIsMenuOpen(false);
          }
        }
      ]
    },
    {
      label: "Contact",
      ariaLabel: "Explore contact options",
      subItems: [
        {
          label: "By WhatsApp",
          ariaLabel: "Contact via WhatsApp",
          onClick: () => {
            openOverlay('whatsapp');
          },
          shouldCloseMenu: false
        },
        {
          label: "By WeChat / 微信",
          ariaLabel: "Contact via WeChat",
          onClick: () => {
            openOverlay('wechat');
          },
          shouldCloseMenu: false
        },
        {
          label: "By KakaoTalk / 카카오톡",
          ariaLabel: "Contact via KakaoTalk",
          onClick: () => {
            openOverlay('kakao');
          },
          shouldCloseMenu: false
        },
        {
          label: "By Email",
          ariaLabel: "Contact via email form",
          onClick: () => {
            openOverlay('email');
          },
          shouldCloseMenu: false
        }
      ]
    }
  ];

  const socialItems = [
    { label: "GitHub", link: "https://github.com" },
    { label: "LinkedIn", link: "https://linkedin.com" },
    { label: "Twitter", link: "https://twitter.com" }
  ];

  return (
    <div className="w-full bg-black relative">
      {/* Menu fixe - visible seulement sur le globe ET caché si panneau ouvert */}
      <div
        className={`fixed top-0 left-0 z-[9999] transition-opacity duration-500 ${showMenu && !activePanel ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      >
        <SideMenu
          items={menuItems}
          socialItems={socialItems}
          displaySocials={true}
          displayItemNumbering={true}
          accentColor="#FF8700"
          isOpen={isMenuOpen}
          onMenuOpen={() => setIsMenuOpen(true)}
          onMenuClose={() => {
            setIsMenuOpen(false);
            closeOverlay();
          }}
        />
      </div>

      {/* Section 1 : Parallax */}
      <ParallaxComponent />

      {/* ✨ Étoiles de TRANSITION (Three.js - 500 étoiles avec gradient 30%→90%) */}
      <div
        className="relative w-full pointer-events-none"
        style={{
          height: '40vh',
          marginTop: '-40vh',
          zIndex: 0,
        }}
      >
        <StarsBackground count={500} densityGradient={true} />
      </div>

      {/* Section 2 : Globe avec étoiles derrière */}
      <div
        className={`relative w-full h-screen bg-black transition-transform duration-500 ${activePanel ? '-translate-x-[25%]' : 'translate-x-0'
          }`}
      >
        {/* ⭐ Étoiles Three.js DERRIÈRE le globe - 3000 étoiles */}
        <div className="absolute inset-0 z-0">
          <StarsBackground count={3000} />
        </div>

        <div className="relative z-20 w-full h-full">
          <RotatingEarth
            isMenuOpen={isMenuOpen}
            onMenuClose={() => setIsMenuOpen(false)}
            isPanelOpen={!!activePanel}
            externalDestinationIndex={externalDestinationIndexRef.current}
            onDestinationChange={(index) => {
              externalDestinationIndexRef.current = index;
            }}
          />
        </div>
      </div>

      {/* Bouton Menu visible quand le panneau est ouvert */}
      {activePanel && (
        <div className="fixed top-0 left-0 z-[10003] p-6 md:p-8">
          <button
            onClick={() => {
              setActivePanel(null); // Fermer le panneau
              setIsMenuOpen(true); // Ouvrir le menu
            }}
            className="cursor-pointer flex items-center gap-2 bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-full transition-all duration-300 border border-orange-500/40 hover:border-orange-500/70 backdrop-blur-md"
            style={{
              animation: 'fadeIn 0.5s ease-out'
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-sm font-medium hidden sm:inline">Menu</span>
          </button>
        </div>
      )}

      {/* Panneau de contenu - Myself */}
      <ContentPanel
        isOpen={activePanel === 'myself'}
        onClose={() => {
          setActivePanel(null);
          setIsMenuOpen(true);
        }}
        title="Myself"
        subtitle="01. About"
      >
        <MyselfContent />
      </ContentPanel>

      {/* Panneau de contenu - My Journey */}
      <ContentPanel
        isOpen={activePanel === 'journey'}
        onClose={() => {
          setActivePanel(null);
          setIsMenuOpen(true);
        }}
        title="My Journey"
        subtitle="02. About"
      >
        <MyJourneyContent />
      </ContentPanel>

      {/* Panneau de contenu - My Timeline */}
      <ContentPanel
        isOpen={activePanel === 'timeline'}
        onClose={() => {
          setActivePanel(null);
          setIsMenuOpen(true);
          externalDestinationIndexRef.current = null;
        }}
        title="My Timeline"
        subtitle="03. About"
      >
        <MyTimelineContent
          onDestinationClick={(index) => { externalDestinationIndexRef.current = index; }}
          currentDestinationIndex={externalDestinationIndexRef.current}
        />
      </ContentPanel>

      {/* Panneau de contenu - My Future Goals */}
      <ContentPanel
        isOpen={activePanel === 'future'}
        onClose={() => {
          setActivePanel(null);
          setIsMenuOpen(true);
        }}
        title="My Future Goals"
        subtitle="04. About"
      >
        <MyFutureGoalsContent />
      </ContentPanel>

      {/* Panneau de contenu - P.E.R */}
      <ContentPanel
        isOpen={activePanel === 'per'}
        onClose={() => {
          setActivePanel(null);
          setIsMenuOpen(true);
        }}
        title="Personal Engagement Report"
        subtitle="01. Projects"
      >
        <PerProjectContent />
      </ContentPanel>

      {/* Panneau de contenu - Scientific Research */}
      <ContentPanel
        isOpen={activePanel === 'research'}
        onClose={() => {
          setActivePanel(null);
          setIsMenuOpen(true);
        }}
        title="Scientific Research"
        subtitle="02. Projects"
      >
        <ScientificResearchContent />
      </ContentPanel>

      {/* Panneau de contenu - International Experience */}
      <ContentPanel
        isOpen={activePanel === 'international'}
        onClose={() => {
          setActivePanel(null);
          setIsMenuOpen(true);
        }}
        title="International Experience"
        subtitle="03. Projects"
      >
        <InternationalExperienceContent />
      </ContentPanel>

      {/* Overlay - WhatsApp */}
      {activeOverlay === 'whatsapp' && (
        <div
          className="fixed inset-0 z-[10004] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={closeOverlay}
        >
          <div
            className="cursor-default relative w-[260px] sm:w-[300px] md:w-[320px] rounded-xl sm:rounded-[2rem] border border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closeOverlay}
              className="cursor-pointer absolute -top-2 right-0 md:-top-1 md:right-1 translate-x-2 md:translate-x-2 text-white/70 hover:text-white transition-all duration-300 hover:rotate-90 text-2xl sm:text-[26px] leading-none z-10"
              aria-label="Close WhatsApp QR overlay"
              type="button"
            >
              <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center">×</span>
            </button>
            <div className="relative aspect-square w-full overflow-hidden rounded-lg sm:rounded-[1.5rem] border border-white/15 bg-black/50">
              <Image
                src="/contact/whatsapp.webp"
                alt="WhatsApp QR code"
                fill
                className="object-contain"
                sizes="(max-width: 640px) 260px, 320px"
                priority
              />
            </div>
            <div className="mt-3 sm:mt-4 text-center">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.35em] text-white/60 break-words">
                scan to contact me by WhatsApp
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay - WeChat */}
      {activeOverlay === 'wechat' && (
        <div
          className="fixed inset-0 z-[10004] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={closeOverlay}
        >
          <div
            className="cursor-default relative w-[260px] sm:w-[300px] md:w-[320px] rounded-xl sm:rounded-[2rem] border border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closeOverlay}
              className="cursor-pointer absolute -top-2 right-0 md:-top-1 md:right-1 translate-x-2 md:translate-x-2 text-white/70 hover:text-white transition-all duration-300 hover:rotate-90 text-2xl sm:text-[26px] leading-none z-10"
              aria-label="Close WeChat QR overlay"
              type="button"
            >
              <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center">×</span>
            </button>
            <div className="relative aspect-square w-full overflow-hidden rounded-lg sm:rounded-[1.5rem] border border-white/15 bg-black/50">
              <Image
                src="/contact/wechat.webp"
                alt="WeChat QR code"
                fill
                className="object-contain"
                sizes="(max-width: 640px) 260px, 320px"
                priority
              />
            </div>
            <div className="mt-3 sm:mt-4 text-center">
              <p className="text-xs sm:text-sm font-semibold text-orange-400 break-words">ID: GilMathis</p>
              <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.35em] text-white/60 break-words">
                scan to contact me on WeChat / 微信
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay - KakaoTalk */}
      {activeOverlay === 'kakao' && (
        <div
          className="fixed inset-0 z-[10004] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
          onClick={closeOverlay}
        >
          <div
            className="cursor-default relative w-[260px] sm:w-[300px] md:w-[320px] rounded-xl sm:rounded-[2rem] border border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closeOverlay}
              className="cursor-pointer absolute -top-2 right-0 md:-top-1 md:right-1 translate-x-2 md:translate-x-2 text-white/70 hover:text-white transition-all duration-300 hover:rotate-90 text-2xl sm:text-[26px] leading-none z-10"
              aria-label="Close KakaoTalk QR overlay"
              type="button"
            >
              <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center">×</span>
            </button>
            <div className="relative aspect-square w-full overflow-hidden rounded-lg sm:rounded-[1.5rem] border border-white/15 bg-black/50">
              <Image
                src="/contact/kakaotalk.webp"
                alt="KakaoTalk QR code"
                fill
                className="object-contain"
                sizes="(max-width: 640px) 260px, 320px"
                priority
              />
            </div>
            <div className="mt-3 sm:mt-4 text-center">
              <p className="text-xs sm:text-sm font-semibold text-orange-400 break-words">ID: GilMathis</p>
              <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.35em] text-white/60 break-words">
                scan to contact me on KakaoTalk / 카카오톡
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay - Email */}
      <div
        className={`cursor-pointer fixed inset-0 z-[10004] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${activeOverlay === 'email' ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'
          }`}
        onClick={closeOverlay}
        aria-hidden={activeOverlay !== 'email'}
      >
        <div
          className="cursor-default relative w-[95%] sm:w-[90%] max-w-[520px] rounded-xl sm:rounded-[2rem] border border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-4 sm:p-6 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={closeOverlay}
            className="cursor-pointer absolute -top-2 right-0 md:-top-1 md:right-1 translate-x-2 md:translate-x-2 text-white/70 hover:text-white transition-all duration-300 hover:rotate-90 text-2xl sm:text-[26px] leading-none z-10"
            aria-label="Close email form overlay"
            type="button"
          >
            <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center">×</span>
          </button>
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center space-y-1 sm:space-y-2">
              <h3 className="text-xl sm:text-2xl font-semibold text-white break-words">Send me an email</h3>
              <p className="text-xs sm:text-sm text-white/60 break-words">Fill out the form below and I&apos;ll get back to you quickly.</p>
            </div>
            <form
              className="space-y-3 sm:space-y-4"
              onSubmit={handleEmailSubmit}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 sm:space-y-2 text-left text-xs sm:text-sm font-medium text-white/80">
                  <span>Name</span>
                  <input
                    type="text"
                    required
                    value={emailForm.name}
                    onChange={(event) => setEmailForm((prev) => ({ ...prev, name: sanitizeInput(event.target.value) }))}
                    className="w-full rounded-lg sm:rounded-xl border border-white/20 bg-black/40 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-white/40 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 transition"
                    placeholder="Your name"
                  />
                </label>
                <label className="space-y-1 sm:space-y-2 text-left text-xs sm:text-sm font-medium text-white/80">
                  <span>Email</span>
                  <input
                    type="email"
                    required
                    value={emailForm.email}
                    onChange={(event) => setEmailForm((prev) => ({ ...prev, email: sanitizeInput(event.target.value) }))}
                    className="w-full rounded-lg sm:rounded-xl border border-white/20 bg-black/40 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-white/40 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 transition"
                    placeholder="you@example.com"
                  />
                </label>
              </div>
              <label className="space-y-1 sm:space-y-2 text-left text-xs sm:text-sm font-medium text-white/80 block">
                <span>Subject</span>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(event) => setEmailForm((prev) => ({ ...prev, subject: sanitizeInput(event.target.value) }))}
                  className="w-full rounded-lg sm:rounded-xl border border-white/20 bg-black/40 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-white/40 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 transition"
                  placeholder="What is this about?"
                />
              </label>
              <label className="space-y-1 sm:space-y-2 text-left text-xs sm:text-sm font-medium text-white/80 block">
                <span>Message</span>
                <textarea
                  required
                  value={emailForm.message}
                  onChange={(event) => setEmailForm((prev) => ({ ...prev, message: sanitizeInput(event.target.value) }))}
                  className="w-full min-h-[120px] sm:min-h-[140px] rounded-lg sm:rounded-xl border border-white/20 bg-black/40 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-white/40 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40 transition resize-none"
                  placeholder="Share the details of your message..."
                />
              </label>
              <div className="flex justify-center pt-2">
                <div
                  ref={recaptchaContainerRef}
                  className="inline-flex rounded-xl border border-white/10 bg-black/20 p-2"
                />
              </div>
              <div className="pt-1 sm:pt-2">
                <button
                  type="submit"
                  disabled={emailStatus === 'loading'}
                  className="cursor-pointer w-full rounded-xl sm:rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white transition hover:shadow-[0_15px_40px_rgba(255,135,0,0.35)] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {emailStatus === 'loading' ? 'Sending…' : 'Send email'}
                </button>
              </div>
            </form>
            {emailStatus === 'success' && (
              <p className="text-center text-xs sm:text-sm text-green-400 break-words">Thank you! Your message has been sent.</p>
            )}
            {emailStatus === 'error' && (
              <p className="text-center text-xs sm:text-sm text-red-400 break-words">{emailError}</p>
            )}
            <p className="text-center text-[10px] sm:text-xs text-white/50 break-words">
              You can also contact me directly at <span className="text-orange-400 break-all">gil.mathis@free.fr</span>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
