'use client';

import Image from "next/image";
import React, { useMemo, useEffect, useState, useCallback, useRef } from "react";
import type { CSSProperties } from "react";

type TimelineEvent = {
  id: string;
  index: number | null;
  date: string;
  city: string;
  country: string;
  duration: string;
  description: string;
  start: { year: number; month: number };
  end?: { year: number; month: number };
  type: 'bubble' | 'label';
  label?: string;
  offsetPx?: number;
  skills?: Array<{ title: string; items: string[] }>;
  visualVariation?: CardVariation;
};

type CardConfig = {
  maxWidth: number;
  maxItems: number;
  lineWidth: number;
  minHeight?: number;
  padding?: number;
};

const CARD_CONFIG: Record<string, CardConfig> = {
  "timeline-aix-cyber-2025": { maxWidth: 680, maxItems: 3, lineWidth: 300, padding: 40 },
  "timeline-seoul-2025": { maxWidth: 680, maxItems: 3, lineWidth: 300, padding: 24 },
  "timeline-seinajoki-2025": { maxWidth: 680, maxItems: 3, lineWidth: 300, padding: 72 },
  "timeline-aix-2024": { maxWidth: 680, maxItems: 3, lineWidth: 300, padding: 56 },
  "timeline-seoul-2024": { maxWidth: 580, maxItems: 4, lineWidth: 180, padding: 40 },
  "timeline-aix-2023": { maxWidth: 580, maxItems: 4, lineWidth: 180, padding: 72 },
  "timeline-seoul-2023": { maxWidth: 580, maxItems: 4, lineWidth: 180, padding: 56 },
  "timeline-boston-2022": { maxWidth: 680, maxItems: 3, lineWidth: 300, padding: 8 },
  "timeline-laneuville-2021": { maxWidth: 680, maxItems: 3, lineWidth: 300, padding: 8 },
  "timeline-baccalaureate-2019": { maxWidth: 580, maxItems: 4, lineWidth: 180, padding: 96 },
  "timeline-paris-dut-2019": { maxWidth: 680, maxItems: 3, lineWidth: 300, padding: 72 },
};

const DEFAULT_CARD_CONFIG: CardConfig = { maxWidth: 580, maxItems: 4, lineWidth: 180, padding: 8 };

const CARD_BOTTOM_GUTTER_PX = 27;
const MIN_LABEL_CARD_HEIGHT = 70;

type CardVariation = {
  widthFactor: number;
  borderRadius: number;
  concaveFocus: number;
};

const CARD_VARIATION_CACHE = new Map<string, CardVariation>();

function getCardVariation(eventId: string): CardVariation {
  if (CARD_VARIATION_CACHE.has(eventId)) {
    return CARD_VARIATION_CACHE.get(eventId)!;
  }

  let hash = 0;
  for (let i = 0; i < eventId.length; i += 1) {
    hash = (hash * 31 + eventId.charCodeAt(i)) >>> 0;
  }

  const widthFactor = 0.9 + ((hash % 21) / 100);
  const borderRadius = 18 + ((hash >> 9) % 5) * 2;
  const concaveFocus = 36 + ((hash >> 13) % 18);

  const variation: CardVariation = {
    widthFactor,
    borderRadius,
    concaveFocus,
  };

  CARD_VARIATION_CACHE.set(eventId, variation);
  return variation;
}

function estimateCardContentHeight(event: TimelineEvent): number {
  if (event.type !== 'bubble' || event.index === null) {
    return MIN_LABEL_CARD_HEIGHT;
  }

  const config = CARD_CONFIG[event.id] ?? DEFAULT_CARD_CONFIG;
  const isWideCard = config.maxWidth > DEFAULT_CARD_CONFIG.maxWidth;
  const displayedSkills = (event.skills ?? []).slice(0, 2);
  const maxSkillItems = config.maxItems;

  const estimateLines = (text: string, charsPerLine: number) =>
    Math.max(1, Math.ceil((text ?? "").length / Math.max(charsPerLine, 1)));

  const descriptionLines = estimateLines(event.description ?? "", isWideCard ? 70 : 56);
  const frontHeight = 76 + descriptionLines * 18;

  const headerHeight = 52;
  const titleChars = isWideCard ? 28 : 24;
  const itemChars = isWideCard ? 40 : 34;
  const titleLineHeight = 18;
  const itemLineHeight = 18;
  const sectionSpacing = 10;

  const sectionHeights = displayedSkills.map((section) => {
    const titleLines = estimateLines(section.title, titleChars);
    const itemLines = section.items
      .slice(0, maxSkillItems)
      .reduce((sum, item) => sum + estimateLines(item, itemChars), 0);
    return sectionSpacing + titleLines * titleLineHeight + itemLines * itemLineHeight;
  });

  const skillsHeight = sectionHeights.length
    ? headerHeight + Math.max(...sectionHeights)
    : 0;

  return Math.max(frontHeight, skillsHeight);
}

interface ContentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const ContentPanel = React.memo(function ContentPanel({ isOpen, onClose, title, subtitle, children }: ContentPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollPosition = useRef<number>(0);

  useEffect(() => {
    if (!isOpen && scrollContainerRef.current) {
      savedScrollPosition.current = scrollContainerRef.current.scrollTop;
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (scrollContainerRef.current && savedScrollPosition.current > 0) {
          scrollContainerRef.current.scrollTop = savedScrollPosition.current;
        }
      }, 500);
    }
  }, [isOpen]);

  return (
    <>
      {/* Panneau de contenu à droite - Animation similaire au menu */}
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:w-[90vw] md:w-[65vw] lg:w-[55vw] xl:w-[50vw] bg-black/95 backdrop-blur-xl z-[10002] transition-transform duration-500 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          borderLeft: '2px solid rgba(255, 135, 0, 0.3)',
          maxWidth: '100vw',
        }}
      >
        {/* Header avec bouton fermer */}
        <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0 relative">
              {/* Subtitle badge - absolute position on mobile for precise alignment */}
              {subtitle && (
                <>
                  {/* Mobile: align with menu button center, offset to the right */}
                  <div className="md:hidden absolute top-4 left-[72px] inline-flex items-center justify-center px-2 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30">
                    <span className="text-[10px] font-mono text-orange-400">{subtitle}</span>
                  </div>
                  {/* Desktop: normal flow above title */}
                  <div className="hidden md:inline-flex items-center justify-center mb-2 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30">
                    <span className="text-xs font-mono text-orange-400">{subtitle}</span>
                  </div>
                </>
              )}
              {/* Title - more padding top on mobile to clear menu button */}
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white break-words pt-12 md:pt-0">
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center text-white/70 hover:text-white transition-all duration-300 hover:rotate-90 text-2xl sm:text-3xl leading-none"
              aria-label="Close panel"
            >
              <span className="leading-none">×</span>
            </button>
          </div>
        </div>

        {/* Contenu scrollable - avec propriétés optimisées pour un scroll fluide */}
        <div 
          ref={scrollContainerRef}
          className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 overflow-y-auto overflow-x-hidden touch-pan-y"
          style={{ 
            height: 'calc(100vh - 100px)',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            willChange: 'scroll-position',
            maxWidth: '100%',
          }}
          onWheel={(event) => {
            event.stopPropagation();
          }}
          onTouchStart={(event) => {
            event.stopPropagation();
          }}
          onTouchMove={(event) => {
            event.stopPropagation();
          }}
        >
          {/* Contenu */}
          <div className="relative w-full">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}, (prevProps, nextProps) => {
  return prevProps.isOpen === nextProps.isOpen && prevProps.title === nextProps.title;
});

export const MyselfContent = () => (
  <div className="space-y-4 text-white/80">
    <p>Content for Myself section will be added here.</p>
  </div>
);

export const MyJourneyContent = () => (
  <div className="space-y-4 text-white/80">
    <p>Content for My Journey section will be added here.</p>
  </div>
);

export const MyTimelineContent = ({ onDestinationClick, currentDestinationIndex }: { onDestinationClick?: (index: number) => void; currentDestinationIndex?: number | null }) => (
  <div className="space-y-4 text-white/80">
    <p>Content for My Timeline section will be added here.</p>
  </div>
);

export const MyFutureGoalsContent = () => (
  <div className="space-y-4 text-white/80">
    <p>Content for My Future Goals section will be added here.</p>
  </div>
);

export const PerProjectContent = () => (
  <div className="space-y-4 text-white/80">
    <p>Content for P.E.R Project will be added here.</p>
  </div>
);

export const ScientificResearchContent = () => (
  <div className="space-y-4 text-white/80">
    <p>Content for Scientific Research will be added here.</p>
  </div>
);

export const InternationalExperienceContent = () => (
  <div className="space-y-4 text-white/80">
    <p>Content for International Experience will be added here.</p>
  </div>
);