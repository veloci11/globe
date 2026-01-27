"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import * as d3 from "d3"

// Variables globales accessibles dans le composant
let containerWidth = 0;
let containerHeight = 0;
// 🚀 OPTIMISATION: Cache pour les données du monde (évite les re-fetch)
let worldDataCache: any = null;
const standardFeaturesCache: any[] = [];
const highlightFeaturesCache: any[] = [];

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
}

// 🎯 CONSTANTES DE TIMING CENTRALISÉES
const TIMINGS = {
  zoomDurationMs: 1800,           // Durée de base (adaptée dynamiquement)
  lineDelayAfterZoomMs: 0,        // Animation démarre IMMÉDIATEMENT après le zoom
  lineDrawMs: 400,                // Trait rapide et dynamique
  contourDelayAfterLineMs: 0,     // Pas utilisé 
  contourDrawMs: 0,               // Pas utilisé
  eraseLineMs: 150,               // Durée d'effacement smooth
  eraseContourMs: 200,            // Durée d'effacement smooth
  popupFadeOutMs: 300,            // Durée de disparition de la popup (correspond à l'animation CSS)
}

// LINE_APPEAR_DELAY_S removed - unused
const POPUP_REVEAL_PROGRESS = 0.25; // Progression de l'animation à partir de laquelle on affiche la popup
const CITY_POPUP_REVEAL_PROGRESS = 0.2; // Popup ville s'affiche tôt (20%) pour une fluidité maximale
const CITY_POPUP_DELAY_MS = 50; // Décalage supplémentaire pour laisser la popup arriver après le trait
const DESTINATION_POPUP_DELAY_MS = 50; // Timing aligné avec les villes cliquables (apparition plus tôt)
const POPUP_ANIMATION_DURATION_S = 0.466; // Durée d'apparition du panneau pour aligner le trait à 75%
const CITY_POPUP_CLICK_DELAY_MS = CITY_POPUP_DELAY_MS + 350; // Délai avant que la popup devienne interactive

// 🎯 UTILITAIRE: Calculer la distance de rotation la plus courte entre deux points
function getShortestRotationDistance(fromLng: number, fromLat: number, toLng: number, toLat: number): number {
  // Normaliser les longitudes pour gérer le passage de -180/180
  const normalizeLng = (lng: number) => {
    while (lng > 180) lng -= 360;
    while (lng < -180) lng += 360;
    return lng;
  };

  const deltaLng = normalizeLng(toLng - fromLng);
  const deltaLat = toLat - fromLat;

  // Distance euclidienne sur la projection (approximation)
  const distance = Math.sqrt(deltaLng * deltaLng + deltaLat * deltaLat);

  return distance;
}

// 🎯 UTILITAIRE: Calculer le rayon d'un point selon son type
function getPointRadius(city: any, isChronological: boolean, scaleFactor: number = 1): number {
  if (city.type === "visited" || city.visited) {
    return 2.75 * scaleFactor; // Total +30%
  } else if (isChronological) {
    return 10.4 * scaleFactor; // Total +30%
  } else {
    return 7.8 * scaleFactor; // Total +30%
  }
}

// 🌍 DESTINATIONS VERTES (VILLES VISITÉES) - Constante statique en dehors du composant
const GREEN_CITIES = {
  paris: { name: "Paris", lng: 2.3522, lat: 48.8566 },
  newYork: { name: "New York", lng: -74.0060, lat: 40.7128 },
  boston: { name: "Boston", lng: -71.0589, lat: 42.3601 },
  washington: { name: "Washington DC", lng: -77.0369, lat: 38.9072 },
  mexicoCity: { name: "Mexico City", lng: -99.1332, lat: 19.4326 },
  sanFrancisco: { name: "San Francisco", lng: -122.4194, lat: 37.7749 },
  lasVegas: { name: "Las Vegas", lng: -115.1398, lat: 36.1699 },
  losAngeles: { name: "Los Angeles", lng: -118.2437, lat: 34.0522 },
  monaco: { name: "Monaco", lng: 7.4246, lat: 43.7384 },
  rome: { name: "Rome", lng: 12.4964, lat: 41.9028 },
  madrid: { name: "Madrid", lng: -3.7038, lat: 40.4168 },
  portugal: { name: "Lisbon", lng: -9.1393, lat: 38.7223 },
  maroc: { name: "Marrakech", lng: -7.9811, lat: 31.6295 },
  namibia: { name: "Windhoek", lng: 17.0658, lat: -22.5597 },
  botswana: { name: "Gaborone", lng: 25.9084, lat: -24.6282 },
  zimbabwe: { name: "Harare", lng: 31.0529, lat: -17.8252 },
  newDelhi: { name: "New Delhi", lng: 77.2090, lat: 28.6139 },
  leh: { name: "Leh", lng: 77.5771, lat: 34.1526 },
  hanoi: { name: "Hanoi", lng: 105.8342, lat: 21.0285 },
  hoChiMinh: { name: "Ho Chi Minh", lng: 106.6297, lat: 10.8231 },
  cambodge: { name: "Phnom Penh", lng: 104.9160, lat: 11.5564 },
  luangPrabang: { name: "Luang Prabang", lng: 102.1350, lat: 19.8845 },
  vientiane: { name: "Vientiane", lng: 102.6077, lat: 17.9757 },
  seoul: { name: "Seoul", lng: 126.9780, lat: 37.5665 },
  daegu: { name: "Daegu", lng: 128.6014, lat: 35.8714 },
  busan: { name: "Busan", lng: 129.0756, lat: 35.1796 },
  tokyo: { name: "Tokyo", lng: 139.6917, lat: 35.6762 },
  oulanBator: { name: "Oulan Bator", lng: 106.9057, lat: 47.8864 },
  shanghai: { name: "Shanghai", lng: 121.4737, lat: 31.2304 },
  zhangjiajie: { name: "Zhangjiajie", lng: 110.4793, lat: 29.1167 },
  chongqing: { name: "Chongqing", lng: 106.5516, lat: 29.4316 },
  guilin: { name: "Guilin", lng: 110.2900, lat: 25.2736 },
  guangzhou: { name: "Guangzhou", lng: 113.2644, lat: 23.1291 },
  hongKong: { name: "Hong Kong", lng: 114.1694, lat: 22.3193 },
  macao: { name: "Macao", lng: 113.5439, lat: 22.1987 },
  cuba: { name: "Havana", lng: -82.3666, lat: 23.1136 },
  costaRica: { name: "San José", lng: -84.0907, lat: 9.9281 },
  london: { name: "London", lng: -0.1278, lat: 51.5074 },
  berlin: { name: "Berlin", lng: 13.4050, lat: 52.5200 },
  helsinki: { name: "Helsinki", lng: 24.9384, lat: 60.1699 }
} as const

// 🛤️ STRUCTURE DES ROUTES VERTES - Constante statique en dehors du composant
const GREEN_ROUTES_RAW = [
  // USA Est - Niveau 0-3
  { from: "paris", to: "newYork", order: 0 },
  { from: "newYork", to: "boston", order: 1 },
  { from: "newYork", to: "washington", order: 1 },
  { from: "washington", to: "mexicoCity", order: 2 },
  // USA Ouest - Niveau 0-2
  { from: "paris", to: "sanFrancisco", order: 0 },
  { from: "sanFrancisco", to: "lasVegas", order: 1 },
  { from: "sanFrancisco", to: "losAngeles", order: 1 },
  // Europe Sud - Niveau 0-3
  { from: "paris", to: "monaco", order: 0 },
  { from: "monaco", to: "rome", order: 1 },
  { from: "paris", to: "madrid", order: 0 },
  { from: "madrid", to: "portugal", order: 1 },
  { from: "portugal", to: "maroc", order: 2 },
  // Afrique - Niveau 0-3
  { from: "paris", to: "namibia", order: 0 },
  { from: "namibia", to: "botswana", order: 1 },
  { from: "botswana", to: "zimbabwe", order: 2 },
  // Inde - Niveau 0-2
  { from: "paris", to: "newDelhi", order: 0 },
  { from: "newDelhi", to: "leh", order: 1 },
  // Vietnam/Laos - Niveau 0-3
  { from: "paris", to: "hanoi", order: 0 },
  { from: "hanoi", to: "hoChiMinh", order: 1 },
  { from: "hoChiMinh", to: "cambodge", order: 2 },
  { from: "hanoi", to: "luangPrabang", order: 1 },
  { from: "luangPrabang", to: "vientiane", order: 2 },
  // Asie Est (Seoul hub) - Niveau 0-5
  { from: "paris", to: "seoul", order: 0 },
  { from: "seoul", to: "daegu", order: 1 },
  { from: "daegu", to: "busan", order: 2 },
  { from: "seoul", to: "tokyo", order: 1 },
  // Chemin 1: Seoul → Oulan-Bator → Shanghai (s'arrête)
  { from: "seoul", to: "oulanBator", order: 1 },
  { from: "oulanBator", to: "shanghai", order: 2 },
  // Chemin 2: Seoul → Shanghai → Zhangjiajie → Chongqing (s'arrête)
  { from: "seoul", to: "shanghai", order: 5 },
  { from: "shanghai", to: "zhangjiajie", order: 6 },
  { from: "zhangjiajie", to: "chongqing", order: 7 },
  { from: "seoul", to: "hongKong", order: 1 },
  // Hong Kong hub - Niveau 0-3
  { from: "paris", to: "hongKong", order: 0 },
  { from: "hongKong", to: "macao", order: 1 },
  { from: "hongKong", to: "guangzhou", order: 1 },
  { from: "guangzhou", to: "guilin", order: 2 },
  // Cuba / Costa Rica - Niveau 0-2
  { from: "paris", to: "cuba", order: 0 },
  { from: "cuba", to: "costaRica", order: 1 },
  // Europe Nord - Niveau 0-3
  { from: "paris", to: "london", order: 0 },
  { from: "london", to: "berlin", order: 1 },
  { from: "berlin", to: "helsinki", order: 2 }
] as const

// 🚀 PRE-CALCUL DES ROUTES VERTES - Fait une seule fois au chargement du module
const precomputeGreenRoutesCache = () => {
  const maxOrder = Math.max(...GREEN_ROUTES_RAW.map(r => r.order))
  const baseOrderDuration = 1 / (maxOrder + 1)

  const memo = new Map<string, number>()

  const calculateStartTime = (route: typeof GREEN_ROUTES_RAW[number], routes: typeof GREEN_ROUTES_RAW): number => {
    const key = `${route.from}-${route.to}`
    if (memo.has(key)) return memo.get(key)!

    if (route.order === 0) {
      memo.set(key, 0)
      return 0
    }

    const possibleParents = routes.filter(r =>
      r.to === route.from && r.order === route.order - 1
    )
    const parentRoute = possibleParents.length > 0
      ? possibleParents[0]
      : routes.find(r => r.to === route.from && r.order < route.order)

    if (!parentRoute) {
      const time = route.order * baseOrderDuration
      memo.set(key, time)
      return time
    }

    const parentFromCity = GREEN_CITIES[parentRoute.from as keyof typeof GREEN_CITIES]
    const parentToCity = GREEN_CITIES[parentRoute.to as keyof typeof GREEN_CITIES]

    if (!parentFromCity || !parentToCity) {
      const time = route.order * baseOrderDuration
      memo.set(key, time)
      return time
    }

    const parentDistance = d3.geoDistance(
      [parentFromCity.lng, parentFromCity.lat],
      [parentToCity.lng, parentToCity.lat]
    ) * 180 / Math.PI

    let parentDistanceFactor = 1.0
    if (parentDistance > 80) parentDistanceFactor = 3.5
    else if (parentDistance > 40) parentDistanceFactor = 2.8
    else if (parentDistance > 20) parentDistanceFactor = 1.8
    else if (parentDistance > 10) parentDistanceFactor = 1.2
    else parentDistanceFactor = 0.8

    const parentDuration = baseOrderDuration * parentDistanceFactor
    const time = calculateStartTime(parentRoute, routes) + parentDuration
    memo.set(key, time)
    return time
  }

  return GREEN_ROUTES_RAW.map(route => {
    const fromCity = GREEN_CITIES[route.from as keyof typeof GREEN_CITIES]
    const toCity = GREEN_CITIES[route.to as keyof typeof GREEN_CITIES]

    if (!fromCity || !toCity) return null

    const routeDistance = d3.geoDistance(
      [fromCity.lng, fromCity.lat],
      [toCity.lng, toCity.lat]
    ) * 180 / Math.PI

    let distanceFactor = 1.0
    if (routeDistance > 80) distanceFactor = 3.5
    else if (routeDistance > 40) distanceFactor = 2.8
    else if (routeDistance > 20) distanceFactor = 1.8
    else if (routeDistance > 10) distanceFactor = 1.2
    else distanceFactor = 0.8

    const lineStartTime = calculateStartTime(route, GREEN_ROUTES_RAW)
    const orderDuration = baseOrderDuration * distanceFactor

    // ⚡ PRE-CALCUL DE LA GÉOMÉTRIE (3D Points) - Optimisation MAJEURE
    const steps = 80
    const points: [number, number, number][] = []

    const dLng = toCity.lng - fromCity.lng
    const dLat = toCity.lat - fromCity.lat
    const distance = Math.sqrt(dLng * dLng + dLat * dLat)

    let maxElevation
    if (distance < 10) maxElevation = distance * 0.05
    else if (distance < 20) maxElevation = distance * 0.08
    else if (distance < 40) maxElevation = distance * 0.04
    else if (distance < 100) maxElevation = distance * 0.016
    else maxElevation = distance * 0.01

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const longitude = fromCity.lng + dLng * t
      const latitude = fromCity.lat + dLat * t
      const elevation = Math.sin(t * Math.PI) * maxElevation
      points.push([longitude, latitude, elevation])
    }

    return {
      ...route,
      fromCity,
      toCity,
      routeDistance,
      distanceFactor,
      lineStartTime,
      orderDuration,
      points // 🔥 Cached Geometry
    }
  }).filter(Boolean) as Array<{
    from: string
    to: string
    order: number
    fromCity: { name: string; lng: number; lat: number }
    toCity: { name: string; lng: number; lat: number }
    routeDistance: number
    distanceFactor: number
    lineStartTime: number
    orderDuration: number
    points: [number, number, number][]
  }>
}

// Cache pré-calculé au chargement du module (0 recalcul à chaque render)
const GREEN_ROUTES_CACHE = precomputeGreenRoutesCache()



interface RotatingEarthComponentProps {
  isMenuOpen?: boolean
  onMenuClose?: () => void
  isPanelOpen?: boolean
  externalDestinationIndex?: number | null
  onDestinationChange?: (index: number) => void
}

// 🏙️ DONNÉES DES VILLES (Statique - Optimisation mémoire)
const CITIES_DATA = [
  {
    name: "Seinäjoki - Finland",
    lng: 22.8403,
    lat: 62.7903,
    type: "study",
    info: {
      school: "SeAMK – Seinäjoki University of Applied Sciences, Finland",
      program: "Currently pursuing a Digital Engineering degree",
      period: "January-April 2025"
    }
  },
  {
    name: "Boston - USA",
    lng: -71.0589,
    lat: 42.3601,
    type: "study",
    info: {
      school: "EF International Language Campus - English courses in Boston, US",
      program: "Studied English in Boston",
      period: "Two semesters March-November 2022"
    }
  },
  {
    name: "Seoul - South Korea",
    lng: 126.9780,
    lat: 37.5665,
    type: "study",
    info: {
      school: "Hanyang University, 한양대학교, Seoul/서울, South Korea /대한민국",
      program: "Korean Language Program at Hanyang University",
      period: "June-August 2025 & June-August 2024 & June-August 2023"
    }
  },
  {
    name: "La Neuville - Switzerland",
    lng: 7.0158,
    lat: 46.7985,
    type: "work", // Ajout du type pour distinguer travail/études
    info: {
      company: "DOMTEKNIKA & SOFTCAR Fribourg, Switzerland",
      position: "Dual Engineering Internship - 5 months",
      period: "March-July 2021"
    }
  },
  {
    name: "Paris - France",
    lng: 2.3522,
    lat: 48.8566,
    type: "study",
    info: {
      school: "IUT de Saint-Denis, Sorbonne Paris Nord University, France",
      program: "Undergraduate Studies in Science and Materials Engineering",
      period: "2019-2021"
    }
  },
  {
    name: "Aix-en-Provence - France",
    lng: 5.4474,
    lat: 43.5297,
    type: "study",
    info: {
      school: "ESAIP, Engineering school, Aix-en-Provence, France",
      program: "Digital Engineering degree & Preparatory cycle for Digital Engineering degree specialize in cybersecurity",
      period: "September 2025-May 2026 & September-December 2024 & September 2023-May 2024 "
    }
  },
  // Villes visitées (points verts)
  { name: "Busan - South Korea", lng: 129.0756, lat: 35.1796, type: "visited" },
  { name: "Daegu - South Korea", lng: 128.6014, lat: 35.8714, type: "visited" },
  { name: "Tokyo - Japan", lng: 139.6917, lat: 35.6895, type: "visited" },
  { name: "Hanoi - Vietnam", lng: 105.8542, lat: 21.0285, type: "visited" },
  { name: "Helsinki - Finland", lng: 24.9384, lat: 60.1699, type: "visited" },
  { name: "Shanghai - China", lng: 121.4737, lat: 31.2304, type: "visited" },
  { name: "Chongqing - China", lng: 106.5348, lat: 29.5630, type: "visited" },
  { name: "Guangzhou - China", lng: 113.2644, lat: 23.1291, type: "visited" },
  { name: "Shenzhen - China", lng: 114.0579, lat: 22.5431, type: "visited" },
  { name: "Zhuhai - China", lng: 113.5767, lat: 22.2769, type: "visited" },
  { name: "Guilin - China", lng: 110.2993, lat: 25.2342, type: "visited" },
  { name: "Zhangjiajie - China", lng: 110.4793, lat: 29.1270, type: "visited" },
  { name: "Hong Kong - China", lng: 114.1694, lat: 22.3193, type: "visited" },
  { name: "Macao - China", lng: 113.5439, lat: 22.1987, type: "visited" },
  { name: "Ulaanbaatar - Mongolia", lng: 106.9057, lat: 47.8864, type: "visited" },
  { name: "San José - Costa Rica", lng: -84.0907, lat: 9.9281, type: "visited" },
  { name: "Los Angeles - USA", lng: -118.2437, lat: 34.0522, type: "visited" },
  { name: "New York City - USA", lng: -74.0060, lat: 40.7128, type: "visited" },
  { name: "Las Vegas - USA", lng: -115.1398, lat: 36.1699, type: "visited" },
  { name: "San Francisco - USA", lng: -122.4194, lat: 37.7749, type: "visited" },
  { name: "Washington - USA", lng: -77.0369, lat: 38.9072, type: "visited" },
  { name: "Mexico City - Mexico", lng: -99.1332, lat: 19.4326, type: "visited" },
  { name: "Vientiane - Laos", lng: 102.6331, lat: 17.9757, type: "visited" },
  { name: "Luang Prabang - Laos", lng: 102.1350, lat: 19.8563, type: "visited" },
  { name: "Ho Chi Minh City - Vietnam", lng: 106.6297, lat: 10.8231, type: "visited" },
  { name: "Havana - Cuba", lng: -82.3666, lat: 23.1136, type: "visited" },
  { name: "Phnom Penh - Cambodia", lng: 104.9160, lat: 11.5564, type: "visited" },
  { name: "New Delhi - India", lng: 77.1025, lat: 28.7041, type: "visited" },
  { name: "Leh - India", lng: 77.5770, lat: 34.1526, type: "visited" },
  { name: "Windhoek - Namibia", lng: 17.0658, lat: -22.5597, type: "visited" },
  { name: "Harare - Zimbabwe", lng: 31.0539, lat: -17.8292, type: "visited" },
  { name: "Gaborone - Botswana", lng: 25.9087, lat: -24.6282, type: "visited" },
  { name: "London - England", lng: -0.1276, lat: 51.5074, type: "visited" },
  { name: "Madrid - Spain", lng: -3.7038, lat: 40.4168, type: "visited" },
  { name: "Lisbon - Portugal", lng: -9.1393, lat: 38.7223, type: "visited" },
  { name: "Berlin - Germany", lng: 13.4050, lat: 52.5200, type: "visited" },
  { name: "Rome - Italy", lng: 12.4964, lat: 41.9028, type: "visited" },
  { name: "Monaco - Monaco", lng: 7.4167, lat: 43.7333, type: "visited" },
  { name: "Rabat - Morocco", lng: -6.8498, lat: 34.0209, type: "visited" }
];

// ✈️ CACHE DES VOLS (GEOMETRIE FIXE) - Défini après CITIES_DATA pour éviter ReferenceError
const precomputeFlightPaths = () => {
  const paths: { points: [number, number, number][] }[] = []

  // Helper pour générer les points d'un vol
  const generatePath = (fromName: string, toName: string, forceWestRoute: boolean = false) => {
    const from = CITIES_DATA.find(c => c.name.toLowerCase().includes(fromName.toLowerCase()))
    const to = CITIES_DATA.find(c => c.name.toLowerCase().includes(toName.toLowerCase()))

    if (!from || !to) return

    const steps = 50
    const points: [number, number, number][] = []

    let dLng = to.lng - from.lng
    if (forceWestRoute && dLng > 0) dLng = dLng - 360

    const dLat = to.lat - from.lat
    const distance = Math.sqrt(dLng * dLng + dLat * dLat)

    let maxElevation
    if (distance < 20) maxElevation = distance * 0.13
    else if (distance < 40) maxElevation = distance * 0.04
    else if (distance < 100) maxElevation = distance * 0.016
    else maxElevation = distance * 0.01

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const longitude = from.lng + dLng * t
      const latitude = from.lat + dLat * t
      const elevation = Math.sin(t * Math.PI) * maxElevation
      points.push([longitude, latitude, elevation])
    }
    paths.push({ points })
  }

  // Définition des routes
  generatePath("Paris", "Boston")
  generatePath("Paris", "La Neuville")
  generatePath("Paris", "Aix-en-Provence")
  generatePath("Aix-en-Provence", "London")
  generatePath("Aix-en-Provence", "Seinäjoki")
  generatePath("Aix-en-Provence", "Seoul")
  generatePath("Boston", "Seoul", true) // Force West
  generatePath("Seinäjoki", "Seoul")

  return paths
}

const FLIGHT_PATHS_CACHE = precomputeFlightPaths()

export default function RotatingEarth({ width, height, className = "", isMenuOpen = false, onMenuClose, isPanelOpen = false, externalDestinationIndex = null, onDestinationChange }: RotatingEarthProps & RotatingEarthComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isSmallMobile, setIsSmallMobile] = useState(false)
  const [selectedCity, setSelectedCity] = useState<any>(null)
  const [autoShowDestinationInfo, setAutoShowDestinationInfo] = useState<any>(null)
  const [popupPosition, setPopupPosition] = useState<{ top: number, left: number }>({ top: 10, left: 6 })

  // Mettre à jour la ref quand selectedCity change
  useEffect(() => {
    selectedCityRef.current = selectedCity
  }, [selectedCity])
  const [isZooming, setIsZooming] = useState(false)
  const [globeStopped, setGlobeStopped] = useState(false)
  // État pour la navigation au scroll
  const [currentDestinationIndex, setCurrentDestinationIndex] = useState(0)
  const [isScrollAnimating, setIsScrollAnimating] = useState(false)
  const [isGlobeRotationStopped, setIsGlobeRotationStopped] = useState(false)
  const [isInOverviewMode, setIsInOverviewMode] = useState(true) // Vue générale par défaut
  const [savedDestinationIndex, setSavedDestinationIndex] = useState(0) // Mémoriser la position

  // Hooks pour les dimensions des popups (déplacés ici pour respecter les règles des hooks)
  const [destinationPopupDimensions, setDestinationPopupDimensions] = useState<{ x: number, y: number, width: number, height: number, radius: number } | null>(null);
  const destinationPopupRef = useRef<HTMLDivElement>(null);
  const [destinationLineLength, setDestinationLineLength] = useState<number>(0);

  const [cityPopupDimensions, setCityPopupDimensions] = useState<{ x: number, y: number, width: number, height: number, radius: number } | null>(null);
  const cityPopupRef = useRef<HTMLDivElement>(null);
  const [cityLineLength, setCityLineLength] = useState<number>(0);

  // États pour gérer les animations de fermeture et d'apparition
  const [isClosingDestination, setIsClosingDestination] = useState(false);
  const [isClosingCity, setIsClosingCity] = useState(false);
  const [isClosingLegend, setIsClosingLegend] = useState(false);
  const [isAppearingDestination, setIsAppearingDestination] = useState(false);
  const [isAppearingCity, setIsAppearingCity] = useState(false);
  const [isCityPopupInteractive, setIsCityPopupInteractive] = useState(false);
  // 🚀 OPTIMISATION: Utiliser des refs pour l'animation UI (évite re-renders)
  const desktopInstructionRef = useRef<HTMLDivElement>(null)
  const mobileInstructionRef = useRef<HTMLDivElement>(null)
  const progressIndicatorRef = useRef<HTMLDivElement>(null)
  const controlOffsetRef = useRef(0); // Garder la ref pour la valeur actuelle
  const [cityLineAnchor, setCityLineAnchor] = useState<{ x: number; y: number } | null>(null);
  const [cityLineReady, setCityLineReady] = useState(false);

  const cityPopupDimensionsRef = useRef<{ width: number, height: number } | null>(null);
  const destinationPopupDimensionsRef = useRef<{ width: number, height: number } | null>(null);
  const autoShowDestinationInfoRef = useRef<any>(null); // Ref pour accès synchrone dans le Canvas
  const popupPositionRef = useRef<{ top: number, left: number }>({ top: 10, left: 6 });
  const cityLineAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const isZoomingRef = useRef(false);
  const lineAnimationRef = useRef(0);
  const isPanelOpenRef = useRef(isPanelOpen);

  useEffect(() => {
    isPanelOpenRef.current = isPanelOpen;
  }, [isPanelOpen]);

  useEffect(() => {
    autoShowDestinationInfoRef.current = autoShowDestinationInfo;
  }, [autoShowDestinationInfo]);

  useEffect(() => {
    isZoomingRef.current = isZooming;
  }, [isZooming]);

  useEffect(() => {
    popupPositionRef.current = popupPosition;
  }, [popupPosition]);

  useEffect(() => {
    cityLineAnchorRef.current = cityLineAnchor;
  }, [cityLineAnchor]);

  useEffect(() => {
    if (cityPopupDimensions) {
      cityPopupDimensionsRef.current = { width: cityPopupDimensions.width, height: cityPopupDimensions.height };
    } else {
      cityPopupDimensionsRef.current = null;
    }
  }, [cityPopupDimensions]);

  useEffect(() => {
    if (destinationPopupDimensions) {
      destinationPopupDimensionsRef.current = { width: destinationPopupDimensions.width, height: destinationPopupDimensions.height };
    } else {
      destinationPopupDimensionsRef.current = null;
    }
  }, [destinationPopupDimensions]);

  // État pour stocker la durée dynamique de l'animation en cours

  // État pour le filtre de catégorie (visited, study, work, null = all)
  const [categoryFilter, setCategoryFilter] = useState<'visited' | 'study' | 'work' | null>(null);

  // Refs pour les conteneurs de ticker (calcul dynamique de hauteur)
  const tickerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [tickerHeights, setTickerHeights] = useState<{ [key: string]: number }>({});

  // 🔄 ROTATION AUTOMATIQUE DE LA LANGUE (Effet Rouleau)

  const LEGEND_DATA = useMemo(() => ({
    visited: { labels: ["방문한 곳", "Visited", "访问"], color: "bg-green-500", text: "text-green-400" },
    study: { labels: ["공부한 곳", "Study", "学习"], color: "bg-red-500", text: "text-red-400" },
    work: { labels: ["근무한 곳", "Work", "工作"], color: "bg-blue-500", text: "text-blue-400" }
  }), []);

  // 📏 Calculer dynamiquement la hauteur de chaque ticker pour animation parfaite
  useEffect(() => {
    const calculateHeights = () => {
      const newHeights: { [key: string]: number } = {};

      ['visited', 'study', 'work'].forEach((type) => {
        const el = tickerRefs.current[type];
        if (el) {
          const children = el.children;
          // On a 6 enfants (2 copies de 3 labels)
          if (children.length >= 4) {
            const firstChild = children[0] as HTMLElement;
            const fourthChild = children[3] as HTMLElement;
            // Mesurer la distance exacte entre le haut du 1er et le haut du 4ème élément
            const firstRect = firstChild.getBoundingClientRect();
            const fourthRect = fourthChild.getBoundingClientRect();
            newHeights[type] = fourthRect.top - firstRect.top;
          }
        }
      });
      if (Object.keys(newHeights).length > 0) {
        setTickerHeights(newHeights);
      }
    };

    // Recalculer après le rendu initial pour s'assurer que les éléments sont montés
    const timer = setTimeout(calculateHeights, 150);

    // Recalculer aussi après le chargement des fonts
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setTimeout(calculateHeights, 50));
    }

    return () => clearTimeout(timer);
  }, []);

  // 🎬 Gérer l'animation d'apparition des popups
  useEffect(() => {
    if (autoShowDestinationInfo) {
      setIsAppearingDestination(false)
      // Démarrer l'animation de la ligne (timestamp)
      lineAnimationRef.current = Date.now();
      // Force un reflow pour redémarrer l'animation
      setTimeout(() => setIsAppearingDestination(true), 10)
    } else {
      setIsAppearingDestination(false)
      setDestinationPopupDimensions(null)
      setDestinationLineLength(0)
    }
  }, [autoShowDestinationInfo])

  useEffect(() => {
    if (cityPopupClickTimeoutRef.current) {
      clearTimeout(cityPopupClickTimeoutRef.current)
      cityPopupClickTimeoutRef.current = null
    }

    if (selectedCity) {
      setIsCityPopupInteractive(false)
      setIsAppearingCity(false)
      // Démarrer l'animation de la ligne avec un léger délai pour synchroniser avec la popup
      lineAnimationRef.current = Date.now() + 100;
      // Force un reflow pour redémarrer l'animation
      setTimeout(() => setIsAppearingCity(true), 50)
      cityPopupClickTimeoutRef.current = setTimeout(() => {
        setIsCityPopupInteractive(true)
        cityPopupClickTimeoutRef.current = null
      }, CITY_POPUP_CLICK_DELAY_MS)
    } else {
      setIsAppearingCity(false)
      setIsCityPopupInteractive(false)
      setCityLineAnchor(null)
      setCityLineReady(false)
      setCityPopupDimensions(null)
      setCityLineLength(0)
    }
  }, [selectedCity])

  // Fonction pour générer une position aléatoire (ou zone adaptée si panneau ouvert)
  const generateRandomPosition = useCallback((isVisited: boolean = false) => {
    // Zone rouge sur le screenshot: Y aléatoire pour tous, X aléatoire uniquement pour points verts (visited)
    // Le point rouge du bas indique le max du BAS de la fenêtre (pas du haut)
    // Popup height ≈ 400-500px, viewport ≈ 900px
    // Donc top max ≈ 60% - (500/900)*100% ≈ 60% - 55% = 5% minimum de marge
    const topMin = 8;
    const topMax = 35; // Ajusté pour que le bas de la popup ne dépasse pas 60%

    // 🎯 AJUSTEMENT POUR MODE SPLIT : décaler vers la droite quand le panneau est ouvert
    // FIX: Augmenté le décalage et la zone pour éviter que les popups soient cachées
    const leftOffset = isPanelOpen ? 35 : 0; // Décalage de 35% vers la droite en mode split (était 15%)
    const leftMin = 4 + leftOffset;
    const leftMax = isPanelOpen ? 55 : (isVisited ? 20 : 8); // Zone plus large quand panneau ouvert

    let newPosition;
    let attempts = 0;
    const maxAttempts = 10;

    // 🔄 Générer jusqu'à ce que la position soit différente de la précédente
    do {
      newPosition = {
        top: Math.random() * (topMax - topMin) + topMin,
        left: Math.random() * (leftMax - leftMin) + leftMin
      };
      attempts++;

      // Vérifier si différent de la position actuelle (tolérance de 3%)
      const isDifferent = !popupPosition ||
        Math.abs(newPosition.top - popupPosition.top) > 3 ||
        Math.abs(newPosition.left - popupPosition.left) > 3;

      if (isDifferent) break;
    } while (attempts < maxAttempts);

    return newPosition;
  }, [popupPosition, isPanelOpen]);

  // 📱 SYSTÈME RESPONSIVE - Adaptation automatique des dimensions
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout

    const updateDimensions = () => {
      // Debounce pour éviter trop de rerenders
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        if (containerRef.current) {
          const newWidth = width || window.innerWidth
          const newHeight = height || window.innerHeight

          setDimensions({ width: newWidth, height: newHeight })
          setIsSmallMobile(newWidth < 480) // Très petites fenêtres/mobiles
          setIsMobile(newWidth < 768)
          setIsTablet(newWidth >= 768 && newWidth < 1024)
        }
      }, 100) // 🚀 OPTIMISATION: Debounce augmenté de 50ms à 100ms pour réduire les recalculs
    }

    updateDimensions()
    // 🚀 OPTIMISATION: passive event listeners pour de meilleures performances
    window.addEventListener('resize', updateDimensions, { passive: true })
    window.addEventListener('orientationchange', updateDimensions) // Support changement d'orientation mobile

    return () => {
      clearTimeout(resizeTimeout)
      window.removeEventListener('resize', updateDimensions)
      window.removeEventListener('orientationchange', updateDimensions)
    }
  }, [width, height])

  // 📱 Configuration viewport pour mobile (si pas déjà défini)
  useEffect(() => {
    const metaViewport = document.querySelector('meta[name="viewport"]')
    if (!metaViewport) {
      const meta = document.createElement('meta')
      meta.name = 'viewport'
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      document.head.appendChild(meta)
    }
  }, [])

  // 🔄 FORCE RE-RENDER QUAND LES DIMENSIONS CHANGENT
  useEffect(() => {
    if (renderRef.current && dimensions.width > 0 && dimensions.height > 0) {
      // Petit délai pour s'assurer que le canvas est bien redimensionné
      setTimeout(() => {
        if (renderRef.current) {
          renderRef.current()
        }
      }, 50)
    }
  }, [dimensions])

  // Destinations chronologiques (parcours académique/professionnel)
  const chronologicalDestinations = useMemo(() => [
    { date: "2019-2021", city: "Paris", country: "France", lng: 2.3522, lat: 48.8566, duration: "1 year and half", description: "Undergraduate Studies in Science and Materials Engineering" },
    { date: "March-July 2021", city: "La Neuville", country: "Switzerland", lng: 7.0158, lat: 46.7985, duration: "5 months", description: "Internship: SOFTCAR/DOMTEKNIKA" },
    { date: "2022", city: "Boston", country: "USA", lng: -71.0589, lat: 42.3601, duration: "April-November 8 months", description: "English courses - EF International Language Campus" },
    { date: "June-August 2023", city: "Seoul", country: "South Korea", lng: 126.9780, lat: 37.5665, duration: "2 months", description: "Korean Language Program - Hanyang University" },
    { date: "September 2023 - May 2024", city: "Aix-en-Provence", country: "France", lng: 5.4474, lat: 43.5297, duration: "8 months", description: "Preparatory cycle for Digital Engineering degree" },
    { date: "June-August 2024", city: "Seoul", country: "South Korea", lng: 126.9780, lat: 37.5665, duration: "2 months", description: "Korean Language Program - Hanyang University" },
    { date: "September-December 2024", city: "Aix-en-Provence", country: "France", lng: 5.4474, lat: 43.5297, duration: "4 months", description: "Digital Engineering degree" },
    { date: "January-April 2025", city: "Seinäjoki", country: "Finland", lng: 22.8403, lat: 62.7903, duration: "4 months", description: "Exchange - SeAMK University of Applied Sciences" },
    { date: "June-August 2025", city: "Seoul", country: "South Korea", lng: 126.9780, lat: 37.5665, duration: "2 months", description: "Korean Language Program - Hanyang University" },
    { date: "September 2025 - May 2026", city: "Aix-en-Provence", country: "France", lng: 5.4474, lat: 43.5297, duration: "8 months", description: "Digital Engineering degree specialized in Cybersecurity" }
  ], [])

  // 🚀 Utiliser les constantes pré-calculées en dehors du composant
  // GREEN_CITIES, GREEN_ROUTES_RAW et GREEN_ROUTES_CACHE sont définis en haut du fichier

  const dezoomFunction = useRef<(() => void) | null>(null)
  const selectedCityRef = useRef<any>(null)
  const legendContainerRef = useRef<HTMLDivElement>(null)
  const legendPopupRef = useRef<HTMLDivElement>(null) // Ref pour la popup de légende (pas le container)
  const projectionRef = useRef<any>(null)
  const radiusRef = useRef<number>(0)
  const rotationRef = useRef<[number, number]>([0, 0]) // Nouvelle ref pour la rotation
  const renderRef = useRef<(() => void) | null>(null) // Ref pour la fonction render

  const autoRotateRef = useRef<boolean>(true) // Ref pour autoRotate - accessible partout
  const stopDestinationAnimationRef = useRef<(() => void) | null>(null) // Ref pour arrêter l'animation de destination
  const cityAnimationFrameRef = useRef<number | null>(null) // ID de l'animation de ville en cours
  const closePopupTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Timeout pour fermeture popup - PARTAGÉ
  const delayAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Timeout pour démarrage animation - PARTAGÉ
  const cityPopupTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Timeout pour affichage popup VILLE (setSelectedCity)
  const destinationPopupTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Timeout pour affichage popup destination/timeline
  const cityPopupClickTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Timeout pour rendre la popup cliquable

  // État pour les lignes vertes - OPTIMISÉ: seules les refs sont utilisées pour l'animation
  const [showGreenLines, setShowGreenLines] = useState(false)
  const showGreenLinesRef = useRef(false)
  const greenLinesProgressRef = useRef(0) // Progress d'animation (0-1) - ref uniquement pour éviter les re-renders
  const pulseProgressRef = useRef(0) // Effet pulse blanc - ref uniquement
  const pulseAnimationRef = useRef<number | null>(null)
  const pulseStartTimeRef = useRef<number | null>(null) // 🚀 OPTIMISATION: Déplacé ici pour être utilisé dans la boucle principale

  // Les refs greenLinesProgressRef et pulseProgressRef sont mises à jour directement
  // dans les boucles d'animation (pas besoin de useEffect pour les synchroniser)
  const isInOverviewModeRef = useRef(isInOverviewMode)
  const isGlobeRotationStoppedRef = useRef(isGlobeRotationStopped)
  const isScrollAnimatingRef = useRef(isScrollAnimating)
  const currentDestinationIndexRef = useRef(currentDestinationIndex)
  const isMenuOpenRef = useRef(isMenuOpen)
  const onMenuCloseRef = useRef(onMenuClose)
  const onDestinationChangeRef = useRef(onDestinationChange)

  // Mettre à jour les refs quand les états changent
  useEffect(() => {
    isInOverviewModeRef.current = isInOverviewMode
  }, [isInOverviewMode])

  useEffect(() => {
    isGlobeRotationStoppedRef.current = isGlobeRotationStopped
  }, [isGlobeRotationStopped])

  useEffect(() => {
    isScrollAnimatingRef.current = isScrollAnimating
  }, [isScrollAnimating])

  useEffect(() => {
    currentDestinationIndexRef.current = currentDestinationIndex
  }, [currentDestinationIndex])

  useEffect(() => {
    isMenuOpenRef.current = isMenuOpen

    // Si le menu s'ouvre et qu'il y a une animation/popup en cours, tout annuler
    if (isMenuOpen && (isScrollAnimating || autoShowDestinationInfo || selectedCity)) {
      // 1. Arrêter l'animation en cours
      if (stopDestinationAnimationRef.current) {
        stopDestinationAnimationRef.current()
      }
      setIsScrollAnimating(false)

      // 2. Fermer toutes les popups
      if (destinationPopupTimeoutRef.current) {
        clearTimeout(destinationPopupTimeoutRef.current)
        destinationPopupTimeoutRef.current = null
      }
      setAutoShowDestinationInfo(null)
      setDestinationPopupDimensions(null)
      setDestinationLineLength(0)
      setSelectedCity(null)
      setCityLineAnchor(null)
      setCityLineReady(false)
      setIsClosingDestination(false)
      setIsClosingCity(false)

      // 3. Retour à la vue overview
      setIsInOverviewMode(true)
      setIsGlobeRotationStopped(false)
      autoRotateRef.current = true

      // 4. Lancer l'animation de retour (reverse/dezoom)
      resetToOverview(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMenuOpen])

  useEffect(() => {
    onMenuCloseRef.current = onMenuClose
  }, [onMenuClose])

  useEffect(() => {
    onDestinationChangeRef.current = onDestinationChange
  }, [onDestinationChange])

  useEffect(() => {
    showGreenLinesRef.current = showGreenLines
  }, [showGreenLines])

  // Les refs greenLinesProgressRef et pulseProgressRef sont mises à jour directement
  // dans les boucles d'animation (pas besoin de useEffect pour les synchroniser)

  // 🔒 FERMER LA LÉGENDE AU CLIC EXTÉRIEUR
  useEffect(() => {
    if (!categoryFilter) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Vérifier si on clique sur un bouton de légende (ou un de ses enfants)
      const isLegendButton = target.closest('[data-legend-button]');

      // Si on clique sur un bouton de légende, ne rien faire (laisser le onClick du bouton gérer)
      if (isLegendButton) {
        return;
      }

      // Vérifier si on a cliqué en dehors de la popup de légende (pas le container)
      if (legendPopupRef.current && !legendPopupRef.current.contains(target)) {
        // Fermer IMMÉDIATEMENT avec animation, même pendant autres animations
        event.stopPropagation();
        setIsClosingLegend(true);
        setTimeout(() => {
          setCategoryFilter(null);
          setIsClosingLegend(false);
        }, 300);
      }
    };

    // Listener GLOBAL avec capture: true pour intercepter AVANT tout (même pendant animations)
    document.addEventListener('mousedown', handleClickOutside, { capture: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, { capture: true });
    };
  }, [categoryFilter]);

  // 🌿🌿 ANIMATION DES LIGNES VERTES (même séquence dans les deux sens) - OPTIMISÉ
  useEffect(() => {
    let animationId: number | null = null
    const startTime = performance.now()
    const startProgress = greenLinesProgressRef.current
    const targetProgress = showGreenLines ? 1 : 0
    const distance = Math.abs(targetProgress - startProgress)

    // Durées différentes pour apparition (6s) et disparition (4s)
    const APPEAR_DURATION = 6000
    const DISAPPEAR_DURATION = 4000
    const duration = showGreenLines ? APPEAR_DURATION : DISAPPEAR_DURATION

    if (distance > 0.001) {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        let progress = Math.min(elapsed / duration, 1)

        // Easing smootherstep pour une animation ultra-fluide sans saccades
        progress = progress * progress * (3 - 2 * progress)

        const newProgress = startProgress + (targetProgress - startProgress) * progress
        greenLinesProgressRef.current = newProgress
        // 🚀 OPTIMISATION: Ne plus appeler setGreenLinesProgress - le rendu est géré par la boucle RAF séparée

        if (elapsed < duration) {
          animationId = requestAnimationFrame(animate)
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [showGreenLines])

  // 🌿 ANIMATION OPTIMISÉE: Un seul RAF pour les lignes vertes + pulse (pas de re-render React)
  useEffect(() => {
    if (!showGreenLines && greenLinesProgressRef.current === 0) return

    let rafId: number | null = null
    let lastRenderTime = 0
    const MIN_FRAME_TIME = 16 // Cap à ~60fps

    const animationLoop = (timestamp: number) => {
      // Throttle pour éviter les renders excessifs
      if (timestamp - lastRenderTime < MIN_FRAME_TIME) {
        rafId = requestAnimationFrame(animationLoop)
        return
      }
      lastRenderTime = timestamp

      // 🚀 OPTIMISATION: Calcul du pulse intégré dans la boucle principale
      if (pulseStartTimeRef.current !== null) {
        const elapsed = timestamp - pulseStartTimeRef.current
        pulseProgressRef.current = (elapsed % 2000) / 2000 // PULSE_DURATION = 2000

        // Reset si les lignes ont disparu
        if (!showGreenLinesRef.current && greenLinesProgressRef.current <= 0.01) {
          pulseProgressRef.current = 0
          pulseStartTimeRef.current = null
        }
      }

      if (renderRef.current) {
        renderRef.current()
      }

      // Continuer tant que l'animation est en cours
      if (showGreenLinesRef.current || greenLinesProgressRef.current > 0.001) {
        rafId = requestAnimationFrame(animationLoop)
      } else {
        rafId = null
      }
    }

    rafId = requestAnimationFrame(animationLoop)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [showGreenLines]) // Dépend seulement du toggle, pas des valeurs de progress

  // ⚡ ANIMATION DU PULSE BLANC - Intégré dans le RAF principal
  useEffect(() => {
    if (showGreenLines) {
      // Démarrer le timing du pulse
      pulseStartTimeRef.current = performance.now()
    }
    // Le pulse sera calculé dans le RAF principal (animationLoop ci-dessus)
  }, [showGreenLines])

  // Mettre à jour les dimensions de la popup destination
  useEffect(() => {
    if (autoShowDestinationInfo) {
      const updateDimensions = () => {
        if (destinationPopupRef.current && containerRef.current) {
          // Utiliser offsetWidth/Height pour obtenir les dimensions "layout" stables, ignorant le scale()
          const width = destinationPopupRef.current.offsetWidth;
          const height = destinationPopupRef.current.offsetHeight;
          const rect = destinationPopupRef.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();

          const dims = {
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            width: width,
            height: height,
            radius: 12
          };
          setDestinationPopupDimensions(dims);
          // ⚡ CRITIQUE: Mettre à jour la ref IMMÉDIATEMENT pour le render loop (évite le lag d'une frame)
          destinationPopupDimensionsRef.current = { width: width, height: height };
        }
      };

      // Mise à jour immédiate
      updateDimensions();

      // Mises à jour multiples pour capturer la popup pendant et après l'animation
      const timer1 = setTimeout(updateDimensions, 50);
      const timer2 = setTimeout(updateDimensions, 150);
      const timer3 = setTimeout(updateDimensions, 300);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [autoShowDestinationInfo, isMobile, isTablet, isSmallMobile, dimensions]);

  // Mettre à jour les dimensions de la popup city
  useEffect(() => {
    if (selectedCity) {
      const updateDimensions = () => {
        if (cityPopupRef.current && containerRef.current) {
          const width = cityPopupRef.current.offsetWidth;
          const height = cityPopupRef.current.offsetHeight;
          const rect = cityPopupRef.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();

          const dims = {
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            width: width,
            height: height,
            radius: 12
          };
          setCityPopupDimensions(dims);
          // ⚡ CRITIQUE: Mettre à jour la ref IMMÉDIATEMENT
          cityPopupDimensionsRef.current = { width: width, height: height };
        }
      };

      // Mise à jour immédiate
      updateDimensions();

      // Mises à jour multiples pour capturer la popup pendant et après l'animation
      const timer1 = setTimeout(updateDimensions, 50);
      const timer2 = setTimeout(updateDimensions, 150);
      const timer3 = setTimeout(updateDimensions, 300);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [selectedCity, isMobile, isTablet, isSmallMobile, dimensions, cityLineAnchor, cityLineReady]);

  // 🔄 Réinitialiser les dimensions et longueurs de lignes quand isPanelOpen change
  useEffect(() => {
    // Forcer la recalculation des dimensions quand on passe du mode normal au mode timeline
    if (destinationPopupRef.current && autoShowDestinationInfo && containerRef.current) {
      setTimeout(() => {
        if (destinationPopupRef.current && containerRef.current) {
          const width = destinationPopupRef.current.offsetWidth;
          const height = destinationPopupRef.current.offsetHeight;
          const rect = destinationPopupRef.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();

          const dims = {
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            width: width,
            height: height,
            radius: 12
          };
          setDestinationPopupDimensions(dims);
        }
      }, 100);
    }

    if (cityPopupRef.current && selectedCity && containerRef.current) {
      setTimeout(() => {
        if (cityPopupRef.current && containerRef.current) {
          const width = cityPopupRef.current.offsetWidth;
          const height = cityPopupRef.current.offsetHeight;
          const rect = cityPopupRef.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();

          const dims = {
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            width: width,
            height: height,
            radius: 12
          };
          setCityPopupDimensions(dims);
        }
      }, 100);
    }
  }, [isPanelOpen, autoShowDestinationInfo, selectedCity]);

  // 📱 GESTION DU MENU - Mettre à jour la projection quand le menu s'ouvre/ferme
  useEffect(() => {
    const currentProjection = projectionRef.current
    const radius = radiusRef.current

    if (currentProjection && radius) {
      // Calculer le décalage
      const menuWidth = isMenuOpen ? Math.min(450, dimensions.width * 0.4) : 0
      const viewOffsetX = isMenuOpen ? menuWidth / 2 : 0

      // Animer le décalage de la vue
      const duration = 500
      const startTime = Date.now()
      const startTranslate = currentProjection.translate()
      const targetTranslate: [number, number] = [
        dimensions.width / 2 + viewOffsetX,
        dimensions.height / 2
      ]

      const startOffset = controlOffsetRef.current
      const targetOffset = viewOffsetX

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeProgress = progress * progress * (3 - 2 * progress) // smoothstep

        const currentTranslate: [number, number] = [
          startTranslate[0] + (targetTranslate[0] - startTranslate[0]) * easeProgress,
          startTranslate[1] + (targetTranslate[1] - startTranslate[1]) * easeProgress
        ]

        currentProjection.translate(currentTranslate)

        // Animer aussi le décalage des contrôles UI avec la même easing - PARFAITEMENT synchronisé
        const currentOffset = startOffset + (targetOffset - startOffset) * easeProgress
        controlOffsetRef.current = currentOffset

        // 🚀 OPTIMISATION: Update DOM direct (bypass React render)
        if (desktopInstructionRef.current) desktopInstructionRef.current.style.transform = `translateX(${currentOffset}px)`
        if (mobileInstructionRef.current) mobileInstructionRef.current.style.transform = `translateX(${currentOffset}px)`
        if (progressIndicatorRef.current) progressIndicatorRef.current.style.transform = `translateX(${currentOffset}px)`

        if (renderRef.current) {
          renderRef.current()
        }

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      animate()
    }
  }, [isMenuOpen, dimensions.width, dimensions.height])

  // Ref pour arrêter resetToOverview
  const stopResetAnimationRef = useRef<(() => void) | null>(null)

  // 🌍 FONCTION RESET À LA VUE GÉNÉRALE
  const resetToOverview = useCallback((fullReset = false) => {
    // Arrêter l'ancienne animation de reset si elle existe
    if (stopResetAnimationRef.current) {
      stopResetAnimationRef.current()
    }

    // Forcer la sortie de l'animation si elle est bloquée
    if (isScrollAnimating) {
      setIsScrollAnimating(false)
    }

    // Arrêter l'animation de destination en cours via la ref
    if (stopDestinationAnimationRef.current) {
      stopDestinationAnimationRef.current()
    }

    // ANNULER LE TIMEOUT DE POPUP VILLE au cas où
    if (cityPopupTimeoutRef.current) {
      clearTimeout(cityPopupTimeoutRef.current)
      cityPopupTimeoutRef.current = null
    }
    if (destinationPopupTimeoutRef.current) {
      clearTimeout(destinationPopupTimeoutRef.current)
      destinationPopupTimeoutRef.current = null
    }
    if (cityPopupClickTimeoutRef.current) {
      clearTimeout(cityPopupClickTimeoutRef.current)
      cityPopupClickTimeoutRef.current = null
    }

    // ⚡ IMMEDIATE RESET: Dégrossir le point tout de suite
    selectedCityRef.current = null;
    isInOverviewModeRef.current = true; // Force la mise à jour immédiate pour le render loop

    setIsScrollAnimating(true)
    setIsInOverviewMode(true)
    setAutoShowDestinationInfo(null)  // Fermer les infos
    setDestinationPopupDimensions(null)
    setDestinationLineLength(0)
    setSelectedCity(null)             // Fermer les popups de villes
    setCityLineAnchor(null)
    setCityLineReady(false)
    setIsCityPopupInteractive(false)

    const canvas = canvasRef.current
    const currentProjection = projectionRef.current
    const radius = radiusRef.current

    if (!canvas || !currentProjection || !radius) {
      setIsScrollAnimating(false)
      return
    }

    const duration = 1800  // Durée pour retour overview
    const startTime = Date.now()
    const startRotation = currentProjection.rotate()
    const startScale = currentProjection.scale()
    const targetRotation: [number, number] = [0, 0]  // Vue globale centrée
    const targetScale = radius  // Zoom de base

    let stopResetAnimation = false
    let resetAnimationFrameId: number | null = null

    // Fonction pour arrêter cette animation
    stopResetAnimationRef.current = () => {
      stopResetAnimation = true
      if (resetAnimationFrameId !== null) {
        cancelAnimationFrame(resetAnimationFrameId)
        resetAnimationFrameId = null
      }
    }

    const animate = () => {
      // Arrêter si annulé
      if (stopResetAnimation) {
        resetAnimationFrameId = null
        return
      }
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      const currentRotation: [number, number] = [
        startRotation[0] + (targetRotation[0] - startRotation[0]) * easeProgress,
        startRotation[1] + (targetRotation[1] - startRotation[1]) * easeProgress
      ]
      const currentScale = startScale + (targetScale - startScale) * easeProgress

      // Vérifier avant d'appliquer (race condition)
      if (stopResetAnimation) {
        resetAnimationFrameId = null
        return
      }

      currentProjection.rotate(currentRotation)
      currentProjection.scale(currentScale)

      if (rotationRef.current) {
        rotationRef.current[0] = currentRotation[0]
        rotationRef.current[1] = currentRotation[1]
      }

      if (renderRef.current) {
        renderRef.current()
      }

      if (progress < 1) {
        resetAnimationFrameId = requestAnimationFrame(animate)
      } else {
        // Dézoom terminé
        setIsScrollAnimating(false)
        resetAnimationFrameId = null
        // Redémarrer la rotation seulement si on a mis isGlobeRotationStopped à false
        // (click à côté qui veut redémarrer la rotation)
        if (fullReset || !isGlobeRotationStoppedRef.current) {
          setIsGlobeRotationStopped(false)
          // IMPORTANT: Redémarrer autoRotate aussi
          autoRotateRef.current = true
        }
      }
    }

    resetAnimationFrameId = requestAnimationFrame(animate)
  }, [isScrollAnimating])

  // 🏙️ NAVIGUER VERS UNE VILLE - Fonction complète pour canvas ET menu legend
  const navigateToCity = useCallback((city: any) => {
    if (!projectionRef.current) return;

    // 0. Fermer le menu si ouvert
    if (onMenuCloseRef.current) {
      onMenuCloseRef.current();
    }

    // 1. Arrêter TOUTES les animations en cours
    if (stopDestinationAnimationRef.current) stopDestinationAnimationRef.current();
    if (stopResetAnimationRef.current) stopResetAnimationRef.current();

    // 2. Reset tous les états + CACHER IMMÉDIATEMENT toute popup
    setIsScrollAnimating(false);
    if (destinationPopupTimeoutRef.current) {
      clearTimeout(destinationPopupTimeoutRef.current);
      destinationPopupTimeoutRef.current = null;
    }
    setAutoShowDestinationInfo(null);
    setDestinationPopupDimensions(null);
    setDestinationLineLength(0);
    setIsClosingDestination(false);
    setIsInOverviewMode(false);
    setIsGlobeRotationStopped(true);
    setGlobeStopped(true);
    autoRotateRef.current = false;

    // 3. Annuler timeouts/animations en cours
    if (cityPopupTimeoutRef.current) {
      clearTimeout(cityPopupTimeoutRef.current);
      cityPopupTimeoutRef.current = null;
    }
    if (cityPopupClickTimeoutRef.current) {
      clearTimeout(cityPopupClickTimeoutRef.current);
      cityPopupClickTimeoutRef.current = null;
    }
    if (cityAnimationFrameRef.current !== null) {
      cancelAnimationFrame(cityAnimationFrameRef.current);
      cityAnimationFrameRef.current = null;
    }

    // 4. VIDER selectedCity pour éviter affichage de l'ancienne popup
    setSelectedCity(null);
    setIsClosingCity(false);
    setCityLineAnchor(null);
    setCityLineReady(false);
    setIsCityPopupInteractive(false);

    // 5. Préparer la nouvelle ville
    const isVisitedCity = city.type === "visited";
    const newPosition = generateRandomPosition(isVisitedCity);
    setPopupPosition(newPosition);

    // 6. Lancer l'animation
    setIsZooming(true);
    animateToCityFromHere(city);

    // 7. Reset le timeout (plus utilisé) pour cohérence
    cityPopupTimeoutRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🏙️ ANIMATION VERS UNE VILLE - Utilisée par navigateToCity
  const animateToCityFromHere = useCallback((city: any) => {
    if (!projectionRef.current || !rotationRef.current || !renderRef.current || !radiusRef.current) return;

    const targetRotation: [number, number] = [-city.lng, -city.lat]
    const startRotation: [number, number] = [rotationRef.current[0], rotationRef.current[1]]
    const startScale = projectionRef.current.scale()
    const targetScale = radiusRef.current * 2.0
    const duration = 1500
    const startTime = Date.now()

    const normalizeAngle = (angle: number) => {
      while (angle > 180) angle -= 360
      while (angle < -180) angle += 360
      return angle
    }

    const deltaLng = normalizeAngle(targetRotation[0] - startRotation[0])
    const deltaLat = normalizeAngle(targetRotation[1] - startRotation[1])

    let infoShown = false;
    const animateToCity = () => {
      if (!projectionRef.current || !rotationRef.current || !renderRef.current) return;

      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      rotationRef.current[0] = startRotation[0] + deltaLng * easeProgress
      rotationRef.current[1] = startRotation[1] + deltaLat * easeProgress

      const newScale = startScale + (targetScale - startScale) * easeProgress
      projectionRef.current.scale(newScale)
      projectionRef.current.rotate(rotationRef.current)
      renderRef.current()

      if (!infoShown && progress >= CITY_POPUP_REVEAL_PROGRESS) {
        infoShown = true

        // Calculer l'ancre STABLE basée sur la destination finale immédiatement
        const canProject = projectionRef.current && typeof (projectionRef.current as any).copy === 'function'
        let anchorPoint: [number, number] | null = null
        if (canProject) {
          const projectionCopy = (projectionRef.current as any).copy()
          projectionCopy.rotate(targetRotation)
          projectionCopy.scale(targetScale)
          const anchor = projectionCopy([city.lng, city.lat])
          anchorPoint = anchor ? [anchor[0], anchor[1]] : null
        } else if (projectionRef.current) {
          // Fallback (moins stable mais fonctionnel)
          const anchor = projectionRef.current([city.lng, city.lat])
          anchorPoint = anchor ? [anchor[0], anchor[1]] : null
        }

        // Fixer l'ancre stable immédiatement dans la ref et le state
        const anchorObj = anchorPoint ? { x: anchorPoint[0], y: anchorPoint[1] } : null;
        cityLineAnchorRef.current = anchorObj;
        setCityLineAnchor(anchorObj)
        setCityLineReady(true)

        if (cityPopupTimeoutRef.current) {
          clearTimeout(cityPopupTimeoutRef.current)
        }
        cityPopupTimeoutRef.current = setTimeout(() => {
          setSelectedCity(city)
          cityPopupTimeoutRef.current = null
        }, CITY_POPUP_DELAY_MS)
      }

      if (progress < 1) {
        cityAnimationFrameRef.current = requestAnimationFrame(animateToCity)
      } else {
        cityAnimationFrameRef.current = null
        const canProject = projectionRef.current && typeof (projectionRef.current as any).copy === 'function'
        let finalAnchor: [number, number] | null = null
        if (canProject) {
          const projectionCopy = (projectionRef.current as any).copy()
          projectionCopy.rotate(targetRotation)
          projectionCopy.scale(targetScale)
          const anchor = projectionCopy([city.lng, city.lat])
          finalAnchor = anchor ? [anchor[0], anchor[1]] : null
        } else if (projectionRef.current) {
          const anchor = projectionRef.current([city.lng, city.lat])
          finalAnchor = anchor ? [anchor[0], anchor[1]] : null
        }
        setCityLineAnchor(finalAnchor ? { x: finalAnchor[0], y: finalAnchor[1] } : null)
        setCityLineReady(Boolean(finalAnchor))
        if (!infoShown) {
          if (cityPopupTimeoutRef.current) {
            clearTimeout(cityPopupTimeoutRef.current)
          }
          cityPopupTimeoutRef.current = setTimeout(() => {
            setSelectedCity(city)
            cityPopupTimeoutRef.current = null
          }, CITY_POPUP_DELAY_MS)
        }
        setIsZooming(false)
      }
    }

    // Démarrer l'animation et stocker l'ID
    cityAnimationFrameRef.current = requestAnimationFrame(animateToCity)
  }, [])

  // 🎯 NAVIGATION AU SCROLL - Animation smooth entre destinations
  const animateToDestination = useCallback((destinationIndex: number) => {
    if (isScrollAnimating) {
      return
    }

    if (destinationIndex < 0 || destinationIndex >= chronologicalDestinations.length) {
      return
    }

    if (stopDestinationAnimationRef.current) {
      stopDestinationAnimationRef.current()
    }

    // CRITIQUE: Arrêter l'animation précédente AVANT de démarrer la nouvelle
    if (closePopupTimeoutRef.current) {
      clearTimeout(closePopupTimeoutRef.current)
      closePopupTimeoutRef.current = null
    }
    if (destinationPopupTimeoutRef.current) {
      clearTimeout(destinationPopupTimeoutRef.current)
      destinationPopupTimeoutRef.current = null
    }

    if (autoShowDestinationInfo) {
      setIsClosingDestination(true)
      const closeDelay = Math.max(TIMINGS.eraseLineMs, TIMINGS.eraseContourMs) + TIMINGS.popupFadeOutMs + 100
      closePopupTimeoutRef.current = setTimeout(() => {
        setAutoShowDestinationInfo(null)
        setIsClosingDestination(false)
        // Réinitialiser les dimensions et longueurs de ligne pour éviter les conflits
        setDestinationPopupDimensions(null)
        setDestinationLineLength(0)
      }, closeDelay)
    }

    // 2. Fermer les popups de ville IMMÉDIATEMENT
    if (selectedCity) {
      setSelectedCity(null)
      selectedCityRef.current = null; // ⚡ Update ref immediately for render loop
      setCityLineAnchor(null)
      setCityLineReady(false)
      setGlobeStopped(false)
    }

    const destination = chronologicalDestinations[destinationIndex]

    // Mettre à jour l'index de destination
    setCurrentDestinationIndex(destinationIndex)

    // Sauvegarder la position et sortir du mode overview
    setSavedDestinationIndex(destinationIndex)
    setIsInOverviewMode(false)

    // Arrêter la rotation automatique + LOCK animation
    setIsGlobeRotationStopped(true)
    setIsScrollAnimating(true)  // 🔒 Lock pour éviter appels multiples

    // Reset l'animation de ligne - mettre un temps passé pour que progress soit à 0
    // Elle sera correctement réinitialisée quand autoShowDestinationInfo sera défini via useEffect
    lineAnimationRef.current = 0;

    // Animation ultra-fluide directe entre destinations - STABLE
    // Attendre la fermeture de la popup si nécessaire
    const closeAnimationTime = Math.max(TIMINGS.eraseLineMs, TIMINGS.eraseContourMs) + 0  // Pas de délai
    const hasPopupToClose = !!autoShowDestinationInfo
    const delayBeforeStart = hasPopupToClose ? closeAnimationTime : 0

    const startTime = Date.now()

    // Récupérer la projection actuelle depuis le canvas
    const canvas = canvasRef.current
    if (!canvas) {
      setIsScrollAnimating(false)
      return
    }

    // Utiliser les refs pour accéder aux variables du useEffect
    const currentProjection = projectionRef.current
    if (!currentProjection) {
      setIsScrollAnimating(false)
      return
    }

    const startRotation = currentProjection.rotate()
    const startScale = currentProjection.scale()
    const targetRotation: [number, number] = [-destination.lng, -destination.lat]

    // Calcul de durée dynamique basé sur la VRAIE distance sphérique
    const distance = getShortestRotationDistance(
      startRotation[0], startRotation[1],
      -destination.lng, -destination.lat
    );

    // Durée adaptative SMOOTH: équilibre entre vitesse et confort visuel
    let totalDuration = 4400  // Base smooth (doublé)
    if (distance > 150) {  // Transitions très longues (Boston-Seoul, etc.)
      totalDuration = 6000  // Smooth et confortable (doublé)
    } else if (distance > 90) {  // Transitions moyennes
      totalDuration = 6000  // Durée intermédiaire (doublé)
    }

    // Utiliser radiusRef pour les calculs de scale
    const radius = radiusRef.current
    if (!radius) {
      setIsScrollAnimating(false)
      return
    }

    const zoomedScale = radius * 2.0  // Zoom modéré et stable

    // Calculer les deltas en tenant compte du chemin le plus court pour la longitude
    const normalizeAngle = (angle: number) => {
      while (angle > 180) angle -= 360;
      while (angle < -180) angle += 360;
      return angle;
    };

    let deltaLng = normalizeAngle(targetRotation[0] - startRotation[0]);
    const deltaLat = targetRotation[1] - startRotation[1];

    // Forcer le chemin le plus court
    if (Math.abs(deltaLng) > 180) {
      deltaLng = deltaLng > 0 ? deltaLng - 360 : deltaLng + 360;
    }

    // PAS de dézoom - on reste à cette position !

    let infoShown = false // Pour éviter les appels multiples à setAutoShowDestinationInfo
    let stopAnimation = false // Flag pour arrêter l'animation si resetToOverview est appelé
    let animationFrameId: number | null = null // Stocker l'ID du requestAnimationFrame

    // Assigner la fonction stop à la ref pour que resetToOverview puisse l'appeler
    stopDestinationAnimationRef.current = () => {
      stopAnimation = true

      // ANNULER TOUS LES TIMEOUTS
      if (closePopupTimeoutRef.current !== null) {
        clearTimeout(closePopupTimeoutRef.current)
        closePopupTimeoutRef.current = null
      }

      if (delayAnimationTimeoutRef.current !== null) {
        clearTimeout(delayAnimationTimeoutRef.current)
        delayAnimationTimeoutRef.current = null
      }

      // ANNULER LE TIMEOUT DE LA POPUP VILLE - C'ÉTAIT ÇA LE VRAI BUG !!!
      if (cityPopupTimeoutRef.current !== null) {
        clearTimeout(cityPopupTimeoutRef.current)
        cityPopupTimeoutRef.current = null
      }
      if (cityPopupClickTimeoutRef.current) {
        clearTimeout(cityPopupClickTimeoutRef.current)
        cityPopupClickTimeoutRef.current = null
      }

      // Annuler le requestAnimationFrame en cours
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }

      // Forcer la fermeture de la popup IMMÉDIATEMENT
      if (destinationPopupTimeoutRef.current) {
        clearTimeout(destinationPopupTimeoutRef.current)
        destinationPopupTimeoutRef.current = null
      }
      setAutoShowDestinationInfo(null)
      setDestinationPopupDimensions(null)
      setDestinationLineLength(0)
      setIsClosingDestination(false)
      setSelectedCity(null)
      setCityLineAnchor(null)
      setCityLineReady(false)
      setIsCityPopupInteractive(false)
    }

    const animate = () => {
      // Arrêter immédiatement si le flag est activé
      if (stopAnimation) {
        // Nettoyer l'ID pour éviter les renders orphelins
        animationFrameId = null
        return
      }
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / totalDuration, 1)

      // Animation progress: ${(progress * 100).toFixed(0)}%

      let currentRotation: [number, number]
      let currentScale: number

      const revealReached = progress >= POPUP_REVEAL_PROGRESS;
      if (progress <= 0.4) {
        // Phase 1: Mouvement direct FLUIDE vers la destination avec zoom (40% du temps)
        const phase1Progress = progress / 0.4
        // easeInOutCubic pour une transition plus lente et progressive
        const easeProgress = phase1Progress < 0.5
          ? 4 * phase1Progress * phase1Progress * phase1Progress
          : 1 - Math.pow(-2 * phase1Progress + 2, 3) / 2

        // Utiliser les deltas calculés pour le chemin le plus court
        currentRotation = [
          startRotation[0] + deltaLng * easeProgress,
          startRotation[1] + deltaLat * easeProgress
        ]
        currentScale = startScale + (zoomedScale - startScale) * easeProgress

        // Masquer les infos tant que l'on n'a pas atteint le seuil d'apparition
        if (!revealReached && autoShowDestinationInfo) {
          if (destinationPopupTimeoutRef.current) {
            clearTimeout(destinationPopupTimeoutRef.current)
            destinationPopupTimeoutRef.current = null
          }
          setAutoShowDestinationInfo(null)
          setDestinationPopupDimensions(null)
          setDestinationLineLength(0)
        }

        if (!infoShown && revealReached && !stopAnimation) {
          infoShown = true
          setIsScrollAnimating(false)

          const isWork = destination.description.toLowerCase().includes('internship') ||
            destination.description.toLowerCase().includes('neuville') ||
            destination.description.toLowerCase().includes('switzerland') ||
            destination.date.toLowerCase().includes('march-july 2021')

          const destinationInfo = {
            name: destination.city,
            info: {
              period: destination.date + " (" + destination.duration + ")",
              description: destination.description,
              type: isWork ? "work" : "study"
            },
            type: isWork ? "work" : "study",
            lng: destination.lng,
            lat: destination.lat
          }

          const newPosition = generateRandomPosition(false)
          setPopupPosition(newPosition)
          setIsClosingDestination(false)
          setDestinationPopupDimensions(null)
          setDestinationLineLength(0)

          if (!stopAnimation) {
            if (destinationPopupTimeoutRef.current) {
              clearTimeout(destinationPopupTimeoutRef.current)
            }
            destinationPopupTimeoutRef.current = setTimeout(() => {
              setAutoShowDestinationInfo(destinationInfo)
              destinationPopupTimeoutRef.current = null
            }, DESTINATION_POPUP_DELAY_MS)
          }
        }

      } else {
        // Phase 2: STABLE sur la destination + affichage infos (60% du temps)
        currentRotation = targetRotation
        currentScale = zoomedScale  // ON RESTE ZOOMÉ - PAS DE DÉZOOM !

        // Débloquer le scroll dès que le mouvement est terminé (une seule fois)
        if (!infoShown) {
          setIsScrollAnimating(false)
        }

        // Afficher la popup SEULEMENT si animation pas annulée
        if (!infoShown && !stopAnimation) {
          infoShown = true

          const isWork = destination.description.toLowerCase().includes('internship') ||
            destination.description.toLowerCase().includes('neuville') ||
            destination.description.toLowerCase().includes('switzerland') ||
            destination.date.toLowerCase().includes('march-july 2021')

          const destinationInfo = {
            name: destination.city,
            info: {
              period: destination.date + " (" + destination.duration + ")",
              description: destination.description,
              type: isWork ? "work" : "study"
            },
            type: isWork ? "work" : "study",
            lng: destination.lng,
            lat: destination.lat
          }

          // Générer NOUVELLE position AVANT d'afficher la popup
          const newPosition = generateRandomPosition(false)
          setPopupPosition(newPosition)

          // IMPORTANT: Reset isClosingDestination pour que l'animation d'entrée fonctionne
          setIsClosingDestination(false)
          setDestinationPopupDimensions(null)
          setDestinationLineLength(0)

          // DOUBLE CHECK juste avant setState - race condition protection
          if (!stopAnimation) {
            if (destinationPopupTimeoutRef.current) {
              clearTimeout(destinationPopupTimeoutRef.current)
            }
            destinationPopupTimeoutRef.current = setTimeout(() => {
              setAutoShowDestinationInfo(destinationInfo)
              destinationPopupTimeoutRef.current = null
            }, DESTINATION_POPUP_DELAY_MS)
          }
        }
      }

      // CRUCIAL: Vérifier une dernière fois avant de render (race condition)
      if (stopAnimation) {
        animationFrameId = null
        return
      }

      // CRUCIAL: Appliquer la rotation et le scale à TOUS les systèmes
      currentProjection.rotate(currentRotation)
      currentProjection.scale(currentScale)

      // Synchroniser avec la variable rotation du useEffect
      if (rotationRef.current) {
        rotationRef.current[0] = currentRotation[0]
        rotationRef.current[1] = currentRotation[1]
      }

      // FORCER le re-render immédiatement
      if (renderRef.current) {
        renderRef.current()
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        // Animation terminée - RESTER STABLE SUR LA DESTINATION
        // Note: isScrollAnimating déjà débloqué à 40%
        // PAS de redémarrage de rotation automatique - on reste sur la destination !
        // setIsGlobeRotationStopped(false) <-- SUPPRIMÉ pour rester stable
        animationFrameId = null // Plus d'animation en cours
      }
    }

    // Démarrer l'animation immédiatement ou après le délai
    if (delayBeforeStart > 0) {
      // Annuler le timeout précédent s'il existe
      if (delayAnimationTimeoutRef.current) {
        clearTimeout(delayAnimationTimeoutRef.current)
      }
      delayAnimationTimeoutRef.current = setTimeout(() => {
        if (!stopAnimation) {
          animationFrameId = requestAnimationFrame(animate)
        }
      }, delayBeforeStart)
    } else {
      animationFrameId = requestAnimationFrame(animate)
    }
  }, [chronologicalDestinations])

  // 🎯 RÉACTION AU CLIC SUR LA TIMELINE - Navigation externe
  const animateToDestinationRef = useRef(animateToDestination)

  useEffect(() => {
    animateToDestinationRef.current = animateToDestination
  }, [animateToDestination])

  useEffect(() => {
    if (externalDestinationIndex === null) {
      return
    }

    if (externalDestinationIndex < 0 || externalDestinationIndex >= chronologicalDestinations.length) {
      return
    }

    if (externalDestinationIndex === currentDestinationIndexRef.current) {
      return
    }

    animateToDestinationRef.current(externalDestinationIndex)
  }, [externalDestinationIndex, chronologicalDestinations])

  useEffect(() => {
    if (onDestinationChangeRef.current) {
      onDestinationChangeRef.current(currentDestinationIndex)
    }
  }, [currentDestinationIndex])

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    // 🚀 OPTIMISATION: willReadFrequently hint pour de meilleures performances 2D
    // ⭐ alpha: true pour permettre aux étoiles de se voir à travers le canvas
    const context = canvas.getContext("2d", { willReadFrequently: false, alpha: true })
    if (!context) return

    // Set up full screen dimensions
    containerWidth = dimensions.width || width || window.innerWidth
    containerHeight = dimensions.height || height || window.innerHeight
    const radius = Math.min(containerWidth, containerHeight) / (
      isSmallMobile ? 2.2 : isMobile ? 2.5 : 3
    )

    const dpr = window.devicePixelRatio || 1
    canvas.width = containerWidth * dpr
    canvas.height = containerHeight * dpr
    canvas.style.width = `${containerWidth}px`
    canvas.style.height = `${containerHeight}px`
    context.scale(dpr, dpr)

    // 🎯 DÉCALAGE DE LA VUE - Décaler le centre X vers la droite quand le menu est ouvert
    const menuWidth = isMenuOpen ? Math.min(450, containerWidth * 0.4) : 0
    const viewOffsetX = isMenuOpen ? menuWidth / 2 : 0

    // Create projection and path generator for Canvas
    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2 + viewOffsetX, containerHeight / 2])

    const path = d3.geoPath().projection(projection).context(context)

    // Initialiser les refs pour l'animation chronologique
    projectionRef.current = projection
    radiusRef.current = radius

    const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
      const [x, y] = point
      let inside = false

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]
        const [xj, yj] = polygon[j]

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside
        }
      }

      return inside
    }

    const pointInFeature = (point: [number, number], feature: any): boolean => {
      const geometry = feature.geometry

      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates
        // Check if point is in outer ring
        if (!pointInPolygon(point, coordinates[0])) {
          return false
        }
        // Check if point is in any hole (inner rings)
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) {
            return false // Point is in a hole
          }
        }
        return true
      } else if (geometry.type === "MultiPolygon") {
        // Check each polygon in the MultiPolygon
        for (const polygon of geometry.coordinates) {
          // Check if point is in outer ring
          if (pointInPolygon(point, polygon[0])) {
            // Check if point is in any hole
            let inHole = false
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true
                break
              }
            }
            if (!inHole) {
              return true
            }
          }
        }
        return false
      }

      return false
    }

    const generateDotsInPolygon = (feature: any, dotSpacing = 16) => {
      const dots: [number, number][] = []
      const bounds = d3.geoBounds(feature)
      const [[minLng, minLat], [maxLng, maxLat]] = bounds

      const stepSize = dotSpacing * 0.08
      // let pointsGenerated = 0 - removed unused counter

      const DEG2RAD = Math.PI / 180

      // OPTIMIZATION: Equal Area Sampling (Adjust longitude step based on latitude)
      // This reduces point density at poles where longitude lines converge.
      for (let lat = minLat; lat <= maxLat; lat += stepSize) {
        // Calculate dynamic longitude step based on latitude
        // At equator (lat=0), cos(0)=1, step is normal
        // At poles (lat=90), cos(90)=0, step would be infinite. We clamp cos to avoid /0.
        // We limit the scaling factor to avoid too sparse dots at extreme poles.
        const cosLat = Math.max(0.1, Math.cos(lat * DEG2RAD))
        const lngStep = stepSize / cosLat

        for (let lng = minLng; lng <= maxLng; lng += lngStep) {
          const point: [number, number] = [lng, lat]
          if (pointInFeature(point, feature)) {
            dots.push(point)
            // pointsGenerated++ - removed unused counter
          }
        }
      }

      // Points generated for land feature
      return dots
    }

    interface DotData {
      lng: number
      lat: number
      visible: boolean
    }

    // Coordonnées des villes avec informations académiques


    // 📅 CHRONOLOGIE : Parcours ordonné par dates (currently unused)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const chronology = [
      {
        date: "2019-2021",
        city: "Paris - France",
        lng: 2.3522,
        lat: 48.8566,
        duration: "2 ans",
        description: "Materials Science & Engineering",
        type: "study"
      },
      {
        date: "Mars-Novembre 2022",
        city: "Boston - USA",
        lng: -71.0589,
        lat: 42.3601,
        duration: "8 mois",
        description: "Cours d'anglais - EF International",
        type: "study"
      },
      {
        date: "Septembre 2023 - Mai 2024",
        city: "Aix-en-Provence - France",
        lng: 5.4474,
        lat: 43.5297,
        duration: "8 mois",
        description: "Digital Engineering Preparatory Cycle",
        type: "study"
      },
      {
        date: "June-Aug 2023",
        city: "Seoul - South Korea",
        lng: 126.9780,
        lat: 37.5665,
        duration: "2 mois",
        description: "Korean Language Program - Hanyang University",
        type: "study"
      },
      {
        date: "June-Aug 2024",
        city: "Seoul - South Korea",
        lng: 126.9780,
        lat: 37.5665,
        duration: "2 mois",
        description: "Return to Hanyang University",
        type: "study"
      },
      {
        date: "Sept 2024 - Fév 2025",
        city: "La Neuville - Switzerland",
        lng: 7.0158,
        lat: 46.7985,
        duration: "6 mois",
        description: "Double Stage: DOMTEKNIKA (3 mois) + SOFTCAR (3 mois)",
        type: "work"
      },
      {
        date: "Septembre 2024 - Décembre 2024",
        city: "Aix-en-Provence - France",
        lng: 5.4474,
        lat: 43.5297,
        duration: "4 mois",
        description: "Reprise Ingénierie Numérique",
        type: "study"
      },
      {
        date: "Janvier-Avril 2025",
        city: "Seinäjoki - Finland",
        lng: 22.8403,
        lat: 62.7903,
        duration: "4 mois",
        description: "Échange - SeAMK University",
        type: "study"
      },
      {
        date: "Juin-Août 2025",
        city: "Seoul - South Korea",
        lng: 126.9780,
        lat: 37.5665,
        duration: "2 mois",
        description: "Troisième séjour à Hanyang",
        type: "study"
      },
      {
        date: "Septembre 2025 - Mai 2026",
        city: "Aix-en-Provence - France",
        lng: 5.4474,
        lat: 43.5297,
        duration: "8 mois",
        description: "Finalisation Ingénierie Numérique",
        type: "study"
      }
    ]

    const paris = CITIES_DATA.find(city => city.name.includes("Paris"))



    // Fonction optimisée pour dessiner un trajet cached
    const drawCachedFlightPath = (points: [number, number, number][], currentScaleFactor: number) => {
      // Projeter les points sur le globe

      const rotation = projection.rotate()
      if (!rotation || rotation.length < 2) return

      const centerLng = -rotation[0]
      const centerLat = -rotation[1]
      const centerX = containerWidth / 2
      const centerY = containerHeight / 2

      for (let i = 0; i < points.length - 1; i += 2) { // Espacement des pointillés
        const [lng1, lat1, elev1] = points[i]
        const [lng2, lat2, elev2] = points[Math.min(i + 1, points.length - 1)]

        // Projeter les points sur le globe
        const start = projection([lng1, lat1])
        const end = projection([lng2, lat2])

        if (start && end) {
          const dx1 = start[0] - centerX
          const dy1 = start[1] - centerY
          const dx2 = end[0] - centerX
          const dy2 = end[1] - centerY

          const elevationScale1 = 1 + (elev1 * 0.08)
          const elevationScale2 = 1 + (elev2 * 0.08)

          const x1 = centerX + dx1 * elevationScale1
          const y1 = centerY + dy1 * elevationScale1
          const x2 = centerX + dx2 * elevationScale2
          const y2 = centerY + dy2 * elevationScale2

          const distance1 = d3.geoDistance([lng1, lat1], [centerLng, centerLat]) * 180 / Math.PI
          const distance2 = d3.geoDistance([lng2, lat2], [centerLng, centerLat]) * 180 / Math.PI
          const avgDistance = (distance1 + distance2) / 2

          const avgElev = (elev1 + elev2) / 2
          const elevationBonus = avgElev * 0.3
          const thresholdStart = 85 + elevationBonus
          const thresholdEnd = 95 + elevationBonus

          let opacity = 1.0
          if (avgDistance > thresholdEnd) {
            opacity = 0.25
          } else if (avgDistance > thresholdStart) {
            const fadeProgress = (avgDistance - thresholdStart) / (thresholdEnd - thresholdStart)
            opacity = 1.0 - (fadeProgress * 0.75)
          }

          if (x1 >= 0 && x1 <= containerWidth && y1 >= 0 && y1 <= containerHeight &&
            x2 >= 0 && x2 <= containerWidth && y2 >= 0 && y2 <= containerHeight) {

            context.beginPath()
            context.moveTo(x1, y1)
            context.lineTo(x2, y2)

            const lineWidth = (2 + avgElev * 0.3) * currentScaleFactor

            context.strokeStyle = `rgba(255, 68, 68, ${opacity})`
            context.lineWidth = lineWidth
            context.stroke()
          }
        }
      }
    }

    // 🌿 TRACÉ DES LIGNES VERTES 3D (Version originale qui fonctionne)
    const drawGreenLine = (from: { lng: number, lat: number }, to: { lng: number, lat: number }, currentScaleFactor: number, progress: number = 1, pulsePos: number = -1) => {
      const steps = 40 // Réduit de 80 à 40 pour meilleures performances
      const points: [number, number, number][] = []

      const dLng = to.lng - from.lng
      const dLat = to.lat - from.lat
      const distance = Math.sqrt(dLng * dLng + dLat * dLat)

      // Système d'élévation adapté
      let maxElevation
      if (distance < 10) maxElevation = distance * 0.05
      else if (distance < 20) maxElevation = distance * 0.08
      else if (distance < 40) maxElevation = distance * 0.04
      else if (distance < 100) maxElevation = distance * 0.016
      else maxElevation = distance * 0.01

      // Générer les points avec élévation
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const longitude = from.lng + dLng * t
        const latitude = from.lat + dLat * t
        const elevation = Math.sin(t * Math.PI) * maxElevation
        points.push([longitude, latitude, elevation])
      }

      const maxIndex = Math.floor(points.length * progress)

      // Récupérer les valeurs une seule fois
      const rotation = projection.rotate()
      if (!rotation || rotation.length < 2) return
      const centerLng = -rotation[0]
      const centerLat = -rotation[1]
      const centerX = containerWidth / 2
      const centerY = containerHeight / 2

      for (let i = 0; i < maxIndex - 1; i++) {
        const [lng1, lat1, elev1] = points[i]
        const [lng2, lat2, elev2] = points[i + 1]

        const start = projection([lng1, lat1])
        const end = projection([lng2, lat2])

        if (start && end) {
          const dx1 = start[0] - centerX
          const dy1 = start[1] - centerY
          const dx2 = end[0] - centerX
          const dy2 = end[1] - centerY

          const elevationScale1 = 1 + (elev1 * 0.08)
          const elevationScale2 = 1 + (elev2 * 0.08)

          const x1 = centerX + dx1 * elevationScale1
          const y1 = centerY + dy1 * elevationScale1
          const x2 = centerX + dx2 * elevationScale2
          const y2 = centerY + dy2 * elevationScale2

          const distance1 = d3.geoDistance([lng1, lat1], [centerLng, centerLat]) * 180 / Math.PI
          const distance2 = d3.geoDistance([lng2, lat2], [centerLng, centerLat]) * 180 / Math.PI
          const avgDistance = (distance1 + distance2) / 2

          const avgElev = (elev1 + elev2) / 2
          const elevationBonus = avgElev * 0.3
          const thresholdStart = 85 + elevationBonus
          const thresholdEnd = 95 + elevationBonus

          let opacity = 1.0
          if (avgDistance > thresholdEnd) opacity = 0.25
          else if (avgDistance > thresholdStart) {
            const fadeProgress = (avgDistance - thresholdStart) / (thresholdEnd - thresholdStart)
            opacity = 1.0 - (fadeProgress * 0.75)
          }

          if (x1 >= 0 && x1 <= containerWidth && y1 >= 0 && y1 <= containerHeight &&
            x2 >= 0 && x2 <= containerWidth && y2 >= 0 && y2 <= containerHeight) {

            context.beginPath()
            context.moveTo(x1, y1)
            context.lineTo(x2, y2)

            const lineWidth = (2 + avgElev * 0.3) * currentScaleFactor
            context.strokeStyle = `rgba(34, 197, 94, ${opacity})`
            context.lineWidth = lineWidth
            context.stroke()

            // Effet de pulse blanc
            if (pulsePos >= 0 && maxIndex > 0) {
              const segmentProgress = i / maxIndex
              const pulseWidth = 0.05
              if (segmentProgress >= pulsePos - pulseWidth / 2 && segmentProgress <= pulsePos + pulseWidth / 2) {
                const distFromCenter = Math.abs(segmentProgress - pulsePos) / (pulseWidth / 2)
                const pulseOpacity = (1 - distFromCenter) * opacity * 0.8

                context.beginPath()
                context.moveTo(x1, y1)
                context.lineTo(x2, y2)
                context.strokeStyle = `rgba(255, 255, 255, ${pulseOpacity})`
                context.lineWidth = lineWidth * 1.5
                context.stroke()
              }
            }
          }
        }
      }
    }




    const allDots: DotData[] = []
    let landFeatures: any
    // 🚀 OPTIMISATION: Buffers réutilisables (évite GC)
    const frontDotsBuffer: number[] = []
    const backDotsBuffer: number[] = []

    const render = () => {
      // Clear canvas
      context.clearRect(0, 0, containerWidth, containerHeight)

      const currentScale = projection.scale()
      const scaleFactor = currentScale / radius

      // 🌊 Récupérer le décalage actuel de la projection
      const currentTranslate = projection.translate()
      const centerX = currentTranslate[0]
      const centerY = currentTranslate[1]
      const currentRotation = projection.rotate()

      // ⚡ ROTATOR RAPIDE pour éviter projection() sur 5000+ points
      const rotator = d3.geoRotation(currentRotation)
      const DEG2RAD = Math.PI / 180

      // Ocean background
      context.beginPath()
      context.arc(centerX, centerY, currentScale, 0, 2 * Math.PI)
      context.fillStyle = "#000000"
      context.fill()
      context.strokeStyle = "#ffffff"
      context.lineWidth = 2 * scaleFactor
      context.stroke()

      if (landFeatures && path) {
        // Draw graticule
        const graticule = d3.geoGraticule()
        const graticuleData = graticule()
        context.beginPath()
        if (graticuleData && typeof path === 'function') {
          try {
            path(graticuleData)
          } catch { }
        }
        context.strokeStyle = "#ffffff"
        context.lineWidth = 1 * scaleFactor
        context.globalAlpha = 0.25
        context.stroke()
        context.globalAlpha = 1

        // 🚀 OPTIMISATION: Buffers pour le rendu par lots (Batch Rendering)
        // Reset buffers (sans réallocation)
        frontDotsBuffer.length = 0
        backDotsBuffer.length = 0

        // Pré-calculer les constantes
        const rBack = 0.85 * scaleFactor // Was 1.0 - Reduced for sharper look
        const rFront = 1.0 * scaleFactor // Was 1.2 - Reduced for sharper look
        const PI2 = 2 * Math.PI

        // Une seule boucle pour tous les calculs (Math + Rotation)
        for (let i = 0; i < allDots.length; i++) {
          const dot = allDots[i]
          const [rLng, rLat] = rotator([dot.lng, dot.lat])

          // Check visibility / Side
          // Projection Orthographique Manuelle optimisée
          const rLatRad = rLat * DEG2RAD
          const rLngRad = rLng * DEG2RAD
          const sinRLat = Math.sin(rLatRad)
          const cosRLat = Math.cos(rLatRad)

          // y ne dépend que de la latitude
          const y = centerY - currentScale * sinRLat
          // x dépend aussi de la longitude
          const x = centerX + currentScale * cosRLat * Math.sin(rLngRad)

          // Back vs Front check (Orthographic: visible if cos(lng) > 0, i.e., -90 < lng < 90)
          // Mais attention D3 rotator behavior: rLng est normalisé?
          if (rLng > -90 && rLng < 90) {
            frontDotsBuffer.push(x, y)
          } else {
            backDotsBuffer.push(x, y)
          }
        }

        // 🌍 1. DESSINER LES BACK DOTS (Batch)
        context.beginPath()
        context.fillStyle = "rgba(100, 100, 100, 0.4)"

        // OPTIMIZATION: Use rect instead of arc for tiny dots (faster rasterization)
        // x, y are center coordinates. rect(x, y, w, h) expects top-left.
        const dBack = rBack * 2
        const dFront = rFront * 2

        for (let i = 0; i < backDotsBuffer.length; i += 2) {
          const x = backDotsBuffer[i]
          const y = backDotsBuffer[i + 1]
          context.rect(x - rBack, y - rBack, dBack, dBack)
        }
        context.fill()

        // Draw land outlines with fill (sur les points arrière)
        if (landFeatures && path) {
          // OPTIMIZATION: Batch Rendering (O(1) instead of O(N))

          // 1. Draw ALL standard countries in one go
          if (standardFeaturesCache.length > 0) {
            context.beginPath()
            // Add all paths to context
            standardFeaturesCache.forEach(feature => {
              try { path(feature) } catch { }
            })

            context.fillStyle = "#050510"
            context.fill()

            context.strokeStyle = "rgba(255, 255, 255, 0.6)"
            context.lineWidth = 0.8 * scaleFactor
            context.stroke()
          }

          // 2. Draw Highlighted countries (Botswana)
          if (highlightFeaturesCache.length > 0) {
            context.beginPath()
            highlightFeaturesCache.forEach(feature => {
              try { path(feature) } catch { }
            })

            context.fillStyle = "#00ff00"
            context.fill()

            context.strokeStyle = "rgba(255, 255, 255, 0.6)"
            context.lineWidth = 0.8 * scaleFactor
            context.stroke()
          }
        }

        // 🚀 2. DESSINER LES FRONT DOTS (Batch)
        // Ces points sont dessinés PAR-DESSUS les continents
        context.beginPath()
        context.fillStyle = "#999999"

        for (let i = 0; i < frontDotsBuffer.length; i += 2) {
          const x = frontDotsBuffer[i]
          const y = frontDotsBuffer[i + 1]
          context.rect(x - rFront, y - rFront, dFront, dFront)
        }
        context.fill()

        // Draw flight paths (Keep original logic for complexity/elevation)
        // Draw flight paths (Keep original logic for complexity/elevation)
        // Draw flight paths (Optimized: Cached Geometry)
        FLIGHT_PATHS_CACHE.forEach(path => {
          drawCachedFlightPath(path.points, scaleFactor)
        })

        // 🌿 LIGNES VERTES - Animation séquentielle
        if (greenLinesProgressRef.current > 0) {
          const globalProgress = greenLinesProgressRef.current
          const pulsePos = pulseProgressRef.current

          GREEN_ROUTES_CACHE.forEach((cachedRoute) => {
            let lineProgress = 0
            if (globalProgress > cachedRoute.lineStartTime) {
              const elapsed = globalProgress - cachedRoute.lineStartTime
              const rawProgress = Math.min(elapsed / cachedRoute.orderDuration, 1)
              lineProgress = rawProgress * rawProgress * (3 - 2 * rawProgress)
            }

            if (lineProgress > 0) {
              drawGreenLine(
                { lng: cachedRoute.fromCity.lng, lat: cachedRoute.fromCity.lat },
                { lng: cachedRoute.toCity.lng, lat: cachedRoute.toCity.lat },
                scaleFactor,
                lineProgress,
                pulsePos
              )
            }
          })
        }

        // Draw city markers (Optimized: Manual Projection)
        CITIES_DATA.forEach((city) => {
          // Utiliser le même algorithme de rotation que pour les dots
          // Cela remplace projection([city.lng, city.lat]) qui calcule trop de choses (clipping complexe, resampling)

          // 1. Rotation sphérique
          const [rLng, rLat] = rotator([city.lng, city.lat])

          // 2. Calcul des coordonnées projetées manuellement
          // x = R * cos(lat) * sin(lng)
          // y = -R * sin(lat) (Y inversé)
          const rLatRad = rLat * DEG2RAD
          const rLngRad = rLng * DEG2RAD
          const x = centerX + currentScale * Math.cos(rLatRad) * Math.sin(rLngRad)
          const y = centerY - currentScale * Math.sin(rLatRad)

          // 3. Vérification de visibilité (Face avant ou limites canvas)
          // Visibilité "Front" simple: cos(lng) > 0 pour Orthographic centré sur 0
          // Ici rLng est la longitude relative après rotation.

          // Vérification si le point est visible (devant)
          // Dans une projection Orthographique standard, ce sont les points avec -90 < rLng < 90
          const isFront = rLng > -90 && rLng < 90

          // NOTE: On dessine TOUS les points (comme avant), mais on gère l'opacité pour ceux derrière (isInterior logic)
          // L'ancienne logique `isInterior` utilisait: `rotatedCoord[0] > 90 || rotatedCoord[0] < -90`
          // C'est exactement l'inverse de `isFront`.
          const isInterior = !isFront

          // Vérifier si le point est dans le canvas (bounding box simple)
          if (
            x >= 0 &&
            x <= containerWidth &&
            y >= 0 &&
            y <= containerHeight
          ) {
            let isSelected = false;
            if (selectedCityRef.current) {
              isSelected = selectedCityRef.current.name === city.name;
            } else if (isZoomingRef.current) {
              isSelected = false;
            } else if (!isInOverviewModeRef.current && autoShowDestinationInfoRef.current) {
              const currentDest = chronologicalDestinations[currentDestinationIndexRef.current];
              if (currentDest) {
                isSelected = city.name.toLowerCase().includes(currentDest.city.toLowerCase());
              }
            }

            const chronoIndex = chronologicalDestinations.findIndex(dest =>
              city.name.toLowerCase().includes(dest.city.toLowerCase())
            )
            const isChronologicalDestination = chronoIndex !== -1

            let baseRadius, selectedRadius
            if (city.type === "visited") {
              baseRadius = isSelected ? 3.1 * scaleFactor : 2.1 * scaleFactor
              selectedRadius = 3.1 * scaleFactor
            } else {
              baseRadius = isSelected ? 4.5 * scaleFactor : 3 * scaleFactor
              selectedRadius = 4.5 * scaleFactor
            }

            if (isChronologicalDestination) {
              baseRadius = isSelected ? 6 * scaleFactor : 4 * scaleFactor
              selectedRadius = 6 * scaleFactor
            }

            let baseColor, selectedColor
            if (city.type === "work") {
              baseColor = "#0066ff"
              selectedColor = "#0066ff"
            } else if (city.type === "visited") {
              baseColor = "#00cc00"
              selectedColor = "#00cc00"
            } else {
              baseColor = "#ff0000"
              selectedColor = "#ff0000"
            }

            const finalRadius = isSelected ? selectedRadius : baseRadius
            context.beginPath()
            context.arc(x, y, finalRadius, 0, 2 * Math.PI) // Utilisation de x, y manuels

            if (isInterior) {
              context.globalAlpha = 0.3
            }

            context.fillStyle = isSelected ? selectedColor : baseColor
            context.fill()

            context.globalAlpha = 1

            if (isInterior) {
              context.globalAlpha = 0.3
            }
            context.beginPath()
            context.arc(x, y, finalRadius, 0, 2 * Math.PI)
            context.strokeStyle = "#ffffff"
            context.lineWidth = isSelected ? 2 * scaleFactor : 1 * scaleFactor
            context.stroke()
            context.globalAlpha = 1

            if (isSelected) {
              if (isInterior) context.globalAlpha = 0.15
              else context.globalAlpha = 0.5

              context.beginPath()
              context.arc(x, y, finalRadius + 2 * scaleFactor, 0, 2 * Math.PI)
              context.strokeStyle = selectedColor
              context.lineWidth = 1 * scaleFactor
              context.stroke()
              context.globalAlpha = 1
            }
          }
        })

        // ⚡ LIGNES DE CONNEXION (Dessinées sur Canvas pour fluidité parfaite)
        const now = Date.now()
        const lineDuration = 1000 // Animation plus lente pour fluidité
        const rawProgress = Math.min(Math.max((now - lineAnimationRef.current) / lineDuration, 0), 1)
        // Easing cubic out pour une sortie fluide
        const lineProgress = 1 - Math.pow(1 - rawProgress, 3)

        // 1. Ligne pour la ville sélectionnée (Click)
        if (selectedCityRef.current && lineProgress > 0 && cityPopupDimensionsRef.current) {
          const currentCity = selectedCityRef.current
          // Toujours utiliser la projection live pour suivre le point
          const projected = projection([currentCity.lng, currentCity.lat])

          if (projected) {
            // Position de la popup: fixe si panneau ouvert, sinon aléatoire
            const effectiveTop = isMobile ? 8 : (isPanelOpenRef.current ? 15 : popupPositionRef.current.top);
            const effectiveLeft = isMobile ? 4 : (isPanelOpenRef.current ? 30 : popupPositionRef.current.left);
            const topPx = (effectiveTop / 100) * containerHeight
            const leftPx = (effectiveLeft / 100) * containerWidth
            // Viser le coin Bas-Droit
            const popupX = leftPx + cityPopupDimensionsRef.current.width + 4
            const popupY = topPx + cityPopupDimensionsRef.current.height + 4

            const dx = popupX - projected[0]
            const dy = popupY - projected[1]
            const angle = Math.atan2(dy, dx)

            const radius = 4.5 * scaleFactor
            const startX = projected[0] + Math.cos(angle) * radius
            const startY = projected[1] + Math.sin(angle) * radius

            // Interpolation pour l'animation de croissance
            const currentEndX = startX + (popupX - startX) * lineProgress
            const currentEndY = startY + (popupY - startY) * lineProgress

            context.beginPath()
            context.moveTo(startX, startY)
            context.lineTo(currentEndX, currentEndY)
            context.strokeStyle = "#ffffff"
            context.lineWidth = 3
            context.lineCap = 'round' // Bout arrondi
            context.lineJoin = 'round'
            context.shadowColor = "white"
            context.shadowBlur = 10
            context.stroke()
            context.shadowBlur = 0
          }
        }

        // 2. Ligne pour la destination auto (Scroll)
        // Afficher le trait quand la popup destination est visible
        // Utiliser la REF pour avoir la valeur à jour dans le render loop
        const currentAutoShowDest = autoShowDestinationInfoRef.current;
        if (!selectedCityRef.current && currentAutoShowDest && lineProgress > 0) {
          // Utiliser autoShowDestinationInfo s'il existe
          const currentDest = currentAutoShowDest;

          if (currentDest) {
            const projected = projection([currentDest.lng, currentDest.lat])

            // Fallback dimensions if ref is not ready yet
            const dims = destinationPopupDimensionsRef.current || { width: 320, height: 200 };

            if (projected) {
              // Position de la popup: fixe si panneau ouvert, sinon aléatoire
              const effectiveTop = isMobile ? 8 : (isPanelOpenRef.current ? 15 : popupPositionRef.current.top);
              const effectiveLeft = isMobile ? 4 : (isPanelOpenRef.current ? 30 : popupPositionRef.current.left);
              const topPx = (effectiveTop / 100) * containerHeight
              const leftPx = (effectiveLeft / 100) * containerWidth

              // Viser le coin Bas-Droit
              const popupX = leftPx + dims.width + 4
              const popupY = topPx + dims.height + 4

              const dx = popupX - projected[0]
              const dy = popupY - projected[1]
              const angle = Math.atan2(dy, dx)
              const radius = 4.5 * scaleFactor

              const startX = projected[0] + Math.cos(angle) * radius
              const startY = projected[1] + Math.sin(angle) * radius

              // Interpolation
              const currentEndX = startX + (popupX - startX) * lineProgress
              const currentEndY = startY + (popupY - startY) * lineProgress

              context.beginPath()
              context.moveTo(startX, startY)
              context.lineTo(currentEndX, currentEndY)
              context.strokeStyle = "#ffffff"
              context.lineWidth = 3
              context.lineCap = 'round' // Bout arrondi
              context.shadowColor = "white"
              context.shadowBlur = 10
              context.stroke()
              context.shadowBlur = 0
            }
          }
        }
      }
    }

    // 🎯 PING: Affichage du nom de la ville quand elle est sélectionnée (Click) OU affichée (Scroll)
    const activePingCity = selectedCityRef.current || (!isInOverviewModeRef.current ? autoShowDestinationInfo : null);

    if (activePingCity) {
      const currentCity = activePingCity
      const projected = projection([currentCity.lng, currentCity.lat])

      if (
        projected &&
        projected[0] >= 0 &&
        projected[0] <= containerWidth &&
        projected[1] >= 0 &&
        projected[1] <= containerHeight
      ) {
        // Afficher le nom seulement si la popup est visible/stabilisée (pour éviter clignotement pendant scroll rapide)
        // Pour le click (selectedCityRef), on affiche toujours
        // Pour le scroll (autoShow), on attend que le mouvement soit fini (isScrollAnimatingRef checked above implicitly via isInOverviewMode)

        const cityName = currentCity.name.split(',')[0]
        context.beginPath()
        context.arc(projected[0], projected[1], 40, 0, 2 * Math.PI)
        context.strokeStyle = "#ff0000"
        context.lineWidth = 5
        context.stroke()
        context.fillStyle = "#ff0000"
        context.font = "20px Arial"
        context.textAlign = "center"
        context.textBaseline = "middle"
        const textY = projected[1] + 60
        context.fillText(cityName, projected[0], textY)
      }
    }

    // Fonction de dézoom réutilisable avec repositionnement caméra
    const createDezoomAnimation = () => {
      // ⚡ IMMEDIATE RESET: Dégrossir le point tout de suite
      selectedCityRef.current = null;

      // Bloquer le scroll pendant l'animation
      setIsZooming(true)
      // Déclencher l'animation de fermeture de la popup city
      setIsClosingCity(true)

      const currentScale = projection.scale()
      const targetScale = radius
      const currentRotation = projection.rotate()
      const targetRotation: [number, number] = [0, 0] // Retour au centre
      const duration = 1800 // ms - même durée que resetToOverview pour cohérence
      const startTime = Date.now()

      const animateDezoom = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // easeInOutQuart pour un effet ULTRA-fluide (plus doux que cubic)
        const easeProgress = progress < 0.5
          ? 8 * progress * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 4) / 2

        // Animation du scale (dézoom)
        const currentAnimScale = currentScale + (targetScale - currentScale) * easeProgress
        projection.scale(currentAnimScale)

        // Animation de la rotation (recentrage)
        const animatedRotation: [number, number] = [
          currentRotation[0] + (targetRotation[0] - currentRotation[0]) * easeProgress,
          currentRotation[1] + (targetRotation[1] - currentRotation[1]) * easeProgress
        ]
        projection.rotate(animatedRotation)

        // Mettre à jour la rotation globale pour la continuité
        rotation[0] = animatedRotation[0]
        rotation[1] = animatedRotation[1]

        render()

        if (progress < 1) {
          requestAnimationFrame(animateDezoom)
        } else {
          // Animation terminée, fermer la popup et redémarrer la rotation
          setIsZooming(false)
          setSelectedCity(null)
          setCityLineAnchor(null)
          setCityLineReady(false)
          setIsClosingCity(false)
          setGlobeStopped(false)
          setIsInOverviewMode(true)
          setIsGlobeRotationStopped(false)
          autoRotateRef.current = true
        }
      }

      requestAnimationFrame(animateDezoom)
    }

    // Assigner la fonction à la ref pour l'accès depuis le bouton
    dezoomFunction.current = createDezoomAnimation

    const loadWorldData = async () => {
      try {
        if (!worldDataCache) {
          const response = await fetch(
            "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson",
          )
          if (!response.ok) throw new Error("Failed to load land data")
          worldDataCache = await response.json()
        }

        landFeatures = worldDataCache

        // Generate dots for all land features (seulement si pas déjà fait)
        if (allDots.length === 0) {
          landFeatures.features.forEach((feature: any) => {
            // OPTIMIZATION: Increased dot spacing from 16 to 18 (~20% fewer dots)
            const dots = generateDotsInPolygon(feature, 18)
            dots.forEach(([lng, lat]) => {
              allDots.push({ lng, lat, visible: true })
            })

            // OPTIMIZATION: Batching land features
            const props = feature.properties || {}
            const countryName = (props.NAME || props.name || props.NAME_EN || props.ADMIN || "").toLowerCase()

            // Check if feature is Botswana (highlighted)
            if (countryName.includes("botswana")) {
              highlightFeaturesCache.push(feature)
            } else {
              standardFeaturesCache.push(feature)
            }
          })
        }

        // Dots generation complete

        render()
      } catch {
        console.error("Failed to load land map data")
      }
    }

    // Set up rotation and interaction
    const rotation: [number, number] = [0, 0]
    const rotationSpeed = 0.24  // Vitesse de rotation en degrés par frame (à 60fps)

    // Connecter les refs pour l'animation chronologique
    rotationRef.current = rotation
    renderRef.current = render
    // Initialiser autoRotate à true
    autoRotateRef.current = true

    // Variables pour le delta time et le throttle
    let lastTime = performance.now()
    let lastRenderTime = 0
    let lowFpsFrameCount = 0 // Track frames with low FPS
    const isLowQualityModeRef = { current: false } // Local, pseudo-ref
    const MIN_RENDER_INTERVAL = 200 // 🚀 OPTIMISATION: Rendu toutes les 200ms quand immobile (était 50ms)

    const rotate = () => {
      // Calculer le delta time pour une vitesse constante
      const now = performance.now()
      const deltaTime = (now - lastTime) / 16.67 // Normaliser à 60fps (16.67ms par frame)
      lastTime = now

      // UTILISER LES REFS pour avoir les valeurs à jour en temps réel
      const currentIsInOverviewMode = isInOverviewModeRef.current
      const currentIsGlobeRotationStopped = isGlobeRotationStoppedRef.current

      // ARRÊT TOTAL: Si on n'est pas en overview mode (on est sur une destination de scroll), PAS DE ROTATION DU TOUT
      // 💪 PERFORMANCE MONITORING: Detect Lag and degrade quality if needed
      // Logic: If FPS < 25 for 1 continuous second, permanently switch to Low Quality Mode (0.75x resolution)
      const currentFps = 1000 / (now - lastTime + 0.1) // Avoid div by zero

      if (currentFps < 25) {
        lowFpsFrameCount++
        if (lowFpsFrameCount > 60 && !isLowQualityModeRef.current) {
          console.warn("⚠️ Low FPS detected (" + currentFps.toFixed(0) + "). Downgrading resolution.")
          isLowQualityModeRef.current = true
          // Trigger a resize on next frame to apply new DPR
          context.canvas.width = 0 // Force reset (optional logic, but handled by resize)
          // We need to re-run the setup logic. 
          // Simplest way: just continue, and let the render loop use the flag? 
          // No, canvas.width needs to change.

          // Quick fix: Set flag and allow the 'resize' event logic to handle it, OR manually trigger setup
          // For now, let's just set the flag. The canvas won't resize instantly, but next resize (or forced) will pick it up.
          // To force it instantly:
          const dpr = window.devicePixelRatio || 1
          const targetDpr = isLowQualityModeRef.current ? Math.min(dpr, 1.0) : dpr
          canvas.width = containerWidth * targetDpr
          canvas.height = containerHeight * targetDpr
          context.scale(targetDpr, targetDpr)
        }
      } else {
        lowFpsFrameCount = Math.max(0, lowFpsFrameCount - 1) // Decay counter
      }


      if (autoRotateRef.current && !globeStopped && !selectedCity && !isZooming && !currentIsGlobeRotationStopped && currentIsInOverviewMode) {
        rotation[0] += rotationSpeed * deltaTime  // Appliquer le delta time
        projection.rotate(rotation)
        render()
        lastRenderTime = now
      } else {
        // Même immobile, re-render périodiquement pour les étoiles scintillantes
        // ⚡ FORCE RENDER 60FPS si une popup est ouverte (pour l'animation fluide de la ligne)
        const hasActivePopup = autoShowDestinationInfo || selectedCityRef.current;

        if (hasActivePopup || now - lastRenderTime > MIN_RENDER_INTERVAL) {
          render()
          lastRenderTime = now
        }
      }
    }

    // Auto-rotation timer
    const rotationTimer = d3.timer(rotate)



    // 📱 FONCTION UNIVERSELLE - Gestion des interactions souris et tactiles
    const getEventCoordinates = (event: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      if ('touches' in event && event.touches.length > 0) {
        // Événement tactile
        return {
          x: event.touches[0].clientX - rect.left,
          y: event.touches[0].clientY - rect.top
        }
      } else if ('clientX' in event) {
        // Événement souris
        return {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        }
      }
      return { x: 0, y: 0 }
    }

    const handleInteractionStart = (event: MouseEvent | TouchEvent) => {
      const { x, y } = getEventCoordinates(event)

      // 🎯 Vérifier si le clic est sur le globe (dans le cercle du globe)
      const globeCenter = projection.translate()
      const globeRadius = projection.scale()
      const distanceFromCenter = Math.sqrt(
        Math.pow(x - globeCenter[0], 2) + Math.pow(y - globeCenter[1], 2)
      )
      const isClickOnGlobe = distanceFromCenter <= globeRadius * 1.05 // 5% de marge

      // Fermer la légende si elle est ouverte et qu'on clique ailleurs
      if (categoryFilter) {
        // Vérifier si le clic est dans la zone de la légende (bas-droit)
        const rect = canvas.getBoundingClientRect();
        const clickX = ('touches' in event && event.touches.length > 0)
          ? event.touches[0].clientX
          : ('clientX' in event ? event.clientX : 0);
        const clickY = ('touches' in event && event.touches.length > 0)
          ? event.touches[0].clientY
          : ('clientY' in event ? event.clientY : 0);

        // Si clic en dehors de la zone légende (bas-droit, ~400px)
        const legendZoneX = rect.right - 450;
        const legendZoneY = rect.bottom - 400;
        if (clickX < legendZoneX || clickY < legendZoneY) {
          setCategoryFilter(null);
          return;
        }
      }

      // Vérifier si on clique sur une ville (navigation possible même avec ville sélectionnée)
      let clickedCity: any = null
      let priorityCity: any = null  // Pour les points rouges/bleus (priorité)
      let visitedCity: any = null   // Pour les points verts (moins priorité)

      CITIES_DATA.forEach((city) => {
        const projected = projection([city.lng, city.lat])
        if (projected) {
          const distance = Math.sqrt(
            Math.pow(x - projected[0], 2) + Math.pow(y - projected[1], 2)
          )

          // Hitbox réduite pour éviter les conflits entre points proches
          const hitboxRadius = city.type === "visited" ? 15 : 20

          if (distance <= hitboxRadius) {
            if (city.type === "visited") {
              visitedCity = city  // Point vert (moins priorité)
            } else {
              priorityCity = city  // Point rouge/bleu (priorité max)
            }
          }
        }
      })

      // Priorité : rouge/bleu d'abord, puis vert
      clickedCity = priorityCity || visitedCity

      // Vérifier si on a cliqué sur le menu (zone gauche)
      // Le menu fait max 450px de largeur selon le CSS
      const clickX = ('touches' in event && event.touches.length > 0)
        ? event.touches[0].clientX
        : ('clientX' in event ? event.clientX : 0)

      const menuWidth = Math.min(window.innerWidth * 0.4, 450) // clamp(280px, 40vw, 450px)
      const isClickOnMenu = isMenuOpenRef.current && clickX < menuWidth

      // Si le menu est ouvert et qu'on ne clique PAS sur le menu, le fermer
      if (isMenuOpenRef.current && onMenuCloseRef.current && !isClickOnMenu) {
        onMenuCloseRef.current()
      }

      if (clickedCity) {
        // Si on clique sur la même ville déjà sélectionnée, dézoomer
        if (selectedCityRef.current && clickedCity.name === selectedCityRef.current.name) {
          createDezoomAnimation()
          return
        }

        // Utiliser la fonction unifiée
        navigateToCity(clickedCity);
        return;
      }

      // Si une ville est sélectionnée mais qu'on clique ailleurs, dézoomer
      if (selectedCityRef.current) {
        createDezoomAnimation()
        return
      }

      // Si on est en train de zoomer sur une ville (animation en cours), dézoomer
      if (isZooming) {
        createDezoomAnimation()
        return
      }

      // NOUVELLE LOGIQUE: Si animation en cours OU destination affichée OU popup ouverte, reset à la vue générale
      // MAIS seulement si le clic est sur le globe
      if (isClickOnGlobe && (isScrollAnimatingRef.current || (!isInOverviewModeRef.current && !selectedCityRef.current) || autoShowDestinationInfo || selectedCity)) {
        // 1. ARRÊTER TOUTES LES ANIMATIONS EN COURS
        if (stopDestinationAnimationRef.current) {
          stopDestinationAnimationRef.current()
        }
        if (stopResetAnimationRef.current) {
          stopResetAnimationRef.current()
        }
        if (isScrollAnimating) {
          setIsScrollAnimating(false)
        }

        // ANNULER LE TIMEOUT DE POPUP VILLE
        if (cityPopupTimeoutRef.current) {
          clearTimeout(cityPopupTimeoutRef.current)
          cityPopupTimeoutRef.current = null
        }
        if (cityPopupClickTimeoutRef.current) {
          clearTimeout(cityPopupClickTimeoutRef.current)
          cityPopupClickTimeoutRef.current = null
        }
        if (destinationPopupTimeoutRef.current) {
          clearTimeout(destinationPopupTimeoutRef.current)
          destinationPopupTimeoutRef.current = null
        }

        // 2. Fermer toutes les popups DÉFINITIVEMENT
        setAutoShowDestinationInfo(null)
        setDestinationPopupDimensions(null)
        setDestinationLineLength(0)
        setSelectedCity(null)
        setCityLineAnchor(null)
        setCityLineReady(false)
        setIsClosingDestination(false)
        setIsClosingCity(false)
        setIsCityPopupInteractive(false)

        // 3. Reset à la vue générale MAIS garder currentDestinationIndex (pas de reset chronologie)
        setIsZooming(false)
        setIsInOverviewMode(true)
        setIsGlobeRotationStopped(false)
        autoRotateRef.current = true

        // 4. Lancer l'animation de retour
        resetToOverview(false)  // false = soft reset, garde la chronologie

        // Empêcher la propagation pour éviter d'autres événements
        event.preventDefault()
        event.stopPropagation()
        return
      }

      // Si le clic n'est pas sur le globe, ne pas déclencher la rotation
      if (!isClickOnGlobe) {
        return
      }

      // Comportement normal de rotation (seulement si aucune ville sélectionnée)
      autoRotateRef.current = false
      const startCoords = getEventCoordinates(event)
      const startRotation: [number, number] = [rotation[0], rotation[1]]

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        const moveCoords = getEventCoordinates(moveEvent)
        const sensitivity = 0.5
        const dx = moveCoords.x - startCoords.x
        const dy = moveCoords.y - startCoords.y

        rotation[0] = startRotation[0] + dx * sensitivity
        rotation[1] = startRotation[1] - dy * sensitivity
        rotation[1] = Math.max(-90, Math.min(90, rotation[1]))

        projection.rotate(rotation)
        render()
      }

      const handleEnd = () => {
        document.removeEventListener("mousemove", handleMove)
        document.removeEventListener("mouseup", handleEnd)
        document.removeEventListener("touchmove", handleMove)
        document.removeEventListener("touchend", handleEnd)

        // IMMÉDIAT: Redémarrer autoRotate directement
        // UTILISER LES REFS pour avoir les valeurs à jour
        const currentIsGlobeRotationStopped = isGlobeRotationStoppedRef.current
        const currentIsInOverviewMode = isInOverviewModeRef.current

        // Ne redémarrer autoRotate QUE si on est en overview mode ET que la rotation n'est pas arrêtée
        if (!currentIsGlobeRotationStopped && currentIsInOverviewMode) {
          autoRotateRef.current = true
        }
      }

      document.addEventListener("mousemove", handleMove)
      document.addEventListener("mouseup", handleEnd)
      document.addEventListener("touchmove", handleMove, { passive: false })
      document.addEventListener("touchend", handleEnd)
    }

    // Support pour les interactions souris et tactiles
    canvas.addEventListener("mousedown", handleInteractionStart)
    canvas.addEventListener("touchstart", handleInteractionStart, { passive: false })

    // Load the world data
    loadWorldData()

    // Cleanup
    return () => {
      rotationTimer.stop()
      canvas.removeEventListener("mousedown", handleInteractionStart)
      canvas.removeEventListener("touchstart", handleInteractionStart)

      // 🚀 OPTIMISATION: Nettoyer tous les timeouts
      if (destinationPopupTimeoutRef.current) {
        clearTimeout(destinationPopupTimeoutRef.current)
        destinationPopupTimeoutRef.current = null
      }
      if (cityPopupTimeoutRef.current) {
        clearTimeout(cityPopupTimeoutRef.current)
        cityPopupTimeoutRef.current = null
      }
      if (closePopupTimeoutRef.current) {
        clearTimeout(closePopupTimeoutRef.current)
        closePopupTimeoutRef.current = null
      }
      if (cityPopupClickTimeoutRef.current) {
        clearTimeout(cityPopupClickTimeoutRef.current)
        cityPopupClickTimeoutRef.current = null
      }

      // 🚀 OPTIMISATION: Nettoyer les animation frames pour éviter les fuites mémoire
      if (cityAnimationFrameRef.current) {
        cancelAnimationFrame(cityAnimationFrameRef.current)
        cityAnimationFrameRef.current = null
      }
      if (pulseAnimationRef.current) {
        cancelAnimationFrame(pulseAnimationRef.current)
        pulseAnimationRef.current = null
      }
      if (stopDestinationAnimationRef.current) {
        stopDestinationAnimationRef.current()
        stopDestinationAnimationRef.current = null
      }
      if (stopResetAnimationRef.current) {
        stopResetAnimationRef.current()
        stopResetAnimationRef.current = null
      }
    }
  }, [width, height, dimensions, isMobile, isTablet, isSmallMobile])

  // Error handling removed (error state no longer used)

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-screen overflow-hidden ${className} z-10`}
      style={{ touchAction: 'none' }} // Optimisation pour le tactile
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          display: "block",
          background: "transparent"
        }}
        onMouseMove={(e) => {
          // Changer le curseur dynamiquement en fonction de la position sur le globe
          const canvas = canvasRef.current
          const projection = projectionRef.current
          if (!canvas || !projection) return

          const rect = canvas.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top

          const globeCenter = projection.translate()
          const globeRadius = projection.scale()
          const distanceFromCenter = Math.sqrt(
            Math.pow(x - globeCenter[0], 2) + Math.pow(y - globeCenter[1], 2)
          )

          canvas.style.cursor = distanceFromCenter <= globeRadius * 1.05 ? 'pointer' : 'default'
        }}
        onMouseLeave={(e) => {
          const canvas = canvasRef.current
          if (canvas) canvas.style.cursor = 'default'
        }}
        onWheel={(e) => {
          // Fermer le menu si l'utilisateur scroll sur le globe
          if (isMenuOpen && onMenuClose) {
            onMenuClose()
          }

          if (categoryFilter) {
            setIsClosingLegend(true)
            setTimeout(() => {
              setCategoryFilter(null)
              setIsClosingLegend(false)
            }, 300)
          }

          // ANNULER LE TIMEOUT DE POPUP VILLE si scroll pendant animation ville
          if (cityPopupTimeoutRef.current) {
            clearTimeout(cityPopupTimeoutRef.current)
            cityPopupTimeoutRef.current = null
          }

          if (cityPopupClickTimeoutRef.current) {
            clearTimeout(cityPopupClickTimeoutRef.current)
            cityPopupClickTimeoutRef.current = null
          }
          setIsCityPopupInteractive(false)

          // Annuler l'animation de zoom vers la ville si en cours
          if (cityAnimationFrameRef.current !== null) {
            cancelAnimationFrame(cityAnimationFrameRef.current)
            cityAnimationFrameRef.current = null
            setIsZooming(false) // Débloquer immédiatement
          }

          // Si on était sur une ville, la fermer immédiatement mais ne PAS retourner en mode overview
          if (selectedCity) {
            setSelectedCity(null)
            setCityLineAnchor(null)
            setCityLineReady(false)
            setGlobeStopped(false)
            // NE PAS setIsInOverviewMode(true) - on veut continuer la navigation
          }

          // Pas de preventDefault car l'événement est passif
          // Bloquer le scroll pendant les animations de scroll ET les animations de zoom/dézoom
          if (isScrollAnimating || isZooming) {
            return
          }

          let newIndex

          if (isInOverviewMode) {
            // Si on est en vue générale, aller à la première destination (scroll down) ou dernière (scroll up)
            if (e.deltaY > 0) {
              newIndex = 0 // Scroll vers le bas = première destination
            } else {
              newIndex = chronologicalDestinations.length - 1 // Scroll vers le haut = dernière destination
            }
          } else {
            // Navigation normale depuis la position actuelle
            if (e.deltaY > 0) {
              // Scroll vers le bas = destination suivante (navigation circulaire)
              newIndex = (currentDestinationIndex + 1) % chronologicalDestinations.length
            } else {
              // Scroll vers le haut = destination précédente (navigation circulaire)
              newIndex = currentDestinationIndex === 0
                ? chronologicalDestinations.length - 1
                : currentDestinationIndex - 1
            }
          }

          // IMPORTANT: Ne plus appeler setCurrentDestinationIndex ici - on laisse animateToDestination le faire
          // setCurrentDestinationIndex(newIndex) <-- SUPPRIMÉ pour éviter double trigger
          animateToDestination(newIndex)
        }}
      />

      {/* Toggle pour les lignes vertes - Style iOS en haut à droite */}
      <div
        className="absolute top-4 right-4 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 rounded-full px-4 py-2 border border-orange-500/30 bg-black/40 backdrop-blur-md">
          <span className="text-white text-sm font-medium select-none">Visited Countries</span>
          <button
            onClick={() => setShowGreenLines(!showGreenLines)}
            className={`cursor-pointer relative w-14 h-7 rounded-full transition-all duration-300 ${showGreenLines ? 'bg-orange-500' : 'bg-gray-600'
              }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-lg transition-transform duration-300 ${showGreenLines ? 'translate-x-7' : 'translate-x-0'
                }`}
            />
          </button>
        </div>
      </div>

      {/* Texte d'instruction au-dessus du container - Desktop: mouse, Mobile: touch */}
      {isInOverviewMode && !selectedCity && !isZooming && (
        <>
          {/* Desktop version */}
          <div
            ref={desktopInstructionRef}
            className="hidden sm:block absolute bottom-12 sm:bottom-14 md:bottom-16 left-4 right-4 pointer-events-none"
            style={{
              transform: `translateX(${controlOffsetRef.current}px)` // Initial render only
            }}
          >
            <div className="text-center text-white/60 text-xs sm:text-sm mx-auto max-w-[280px]">
              Use your mouse to explore the globe
            </div>
          </div>
          {/* Mobile version */}
          <div
            ref={mobileInstructionRef}
            className="sm:hidden absolute bottom-24 left-4 right-4 pointer-events-none"
            style={{
              transform: `translateX(${controlOffsetRef.current}px)`
            }}
          >
            <div className="text-center text-white/60 text-xs mx-auto max-w-[240px]">
              Touch and drag to explore the globe
            </div>
          </div>
        </>
      )}

      {/* Indicateur de progression - Position fixe et texte centré */}
      <div
        ref={progressIndicatorRef}
        className="absolute bottom-4 sm:bottom-4 md:bottom-5 lg:bottom-6 left-4 right-4 pointer-events-none"
        style={{
          transform: `translateX(${controlOffsetRef.current}px)`
        }}
      >
        <div className="bg-black/60 backdrop-blur-md rounded-full px-4 pt-3 pb-4 sm:px-4 sm:py-2 border border-orange-500/30 pointer-events-auto w-fit mx-auto">
          {/* Mobile: vertical layout (text on top, dots+reset below) | Desktop: horizontal */}
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-1.5 sm:gap-0 text-white">
            {/* Information destination actuelle - une ligne sur mobile */}
            <div className="text-xs sm:text-sm text-center sm:flex-1 sm:mr-3 whitespace-nowrap">
              {isZooming || selectedCity ? (
                <span className="font-semibold text-orange-500 select-none">Zoomed</span>
              ) : isInOverviewMode ? (
                <>
                  <span className="font-semibold text-orange-500 select-none">Overview</span>
                  <span className="text-gray-300 select-none text-[10px] sm:text-xs hidden sm:inline"> · Scroll to see my journey</span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-blue-400">{chronologicalDestinations[currentDestinationIndex]?.country}</span>
                  <span className="text-gray-300 ml-1">
                    {(() => {
                      const date = chronologicalDestinations[currentDestinationIndex]?.date || ""
                      const yearMatches = date.match(/\b(19|20)\d{2}\b/g)
                      if (yearMatches && yearMatches.length > 1) {
                        const uniqueYears = [...new Set(yearMatches)]
                        return uniqueYears.join('-')
                      } else if (yearMatches && yearMatches.length === 1) {
                        return yearMatches[0]
                      } else {
                        return date.includes('-') ? date.split('-')[0].split(' ').pop() : date.split(' ')[0]
                      }
                    })()}
                  </span>
                </>
              )}
            </div>

            {/* Points de progression + Bouton reset - tout sur une ligne */}
            <div className="flex gap-1.5 sm:gap-1.5 justify-center items-center">
              {chronologicalDestinations.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-5 h-5 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full transition-colors duration-200 cursor-pointer touch-manipulation bg-gray-600 hover:bg-gray-400 data-[active=true]:bg-blue-400 data-[active=true]:scale-125"
                  data-active={index === currentDestinationIndex}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    if (index !== currentDestinationIndex && !isScrollAnimating) {
                      setCurrentDestinationIndex(index)
                      animateToDestination(index)
                    }
                  }}
                />
              ))}

              {/* Bouton reset - même taille que les dots sur mobile */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()

                  // 1. ARRÊTER toutes les animations en cours
                  if (stopDestinationAnimationRef.current) {
                    stopDestinationAnimationRef.current()
                  }
                  setIsScrollAnimating(false)

                  // ANNULER LE TIMEOUT DE POPUP VILLE
                  if (cityPopupTimeoutRef.current) {
                    clearTimeout(cityPopupTimeoutRef.current)
                    cityPopupTimeoutRef.current = null
                  }
                  if (destinationPopupTimeoutRef.current) {
                    clearTimeout(destinationPopupTimeoutRef.current)
                    destinationPopupTimeoutRef.current = null
                  }

                  // 2. Fermer toutes les popups
                  setAutoShowDestinationInfo(null)
                  setDestinationPopupDimensions(null)
                  setDestinationLineLength(0)
                  setSelectedCity(null)
                  setCityLineAnchor(null)
                  setCityLineReady(false)
                  setIsClosingDestination(false)
                  setIsClosingCity(false)

                  // 3. Reset complet
                  setIsInOverviewMode(true)
                  setCurrentDestinationIndex(0)
                  setSavedDestinationIndex(0)
                  setIsGlobeRotationStopped(false)
                  autoRotateRef.current = true

                  // 4. Lancer animation de reset (toujours, même pendant animation)
                  resetToOverview(true)
                }}
                className="cursor-pointer w-5 h-5 sm:w-5 sm:h-5 bg-black/30 hover:bg-black/50 text-white/70 hover:text-white text-[10px] sm:text-xs rounded-full border border-white/20 hover:border-white/40 transition-colors duration-150 flex items-center justify-center touch-manipulation ml-1"
                title="Reset"
              >
                ↻
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Panneau d'informations automatique pour navigation chronologique - SEULEMENT si pas de ville sélectionnée */}
      {(() => {
        // SIMPLE : popup s'affiche SI autoShowDestinationInfo existe ET pas de ville sélectionnée
        const shouldShowPopup = autoShowDestinationInfo && !selectedCity;



        if (!shouldShowPopup) {
          return null;
        }

        const pointProjection = projectionRef.current?.([autoShowDestinationInfo.lng, autoShowDestinationInfo.lat]);

        // 🎯 Calculer le rayon précis du point (chronologique = 8 pixels)
        const scaleFactor = 1; // Peut être ajusté selon le zoom
        const pointRadius = getPointRadius(autoShowDestinationInfo, true, scaleFactor);

        // Décaler le contour pour qu'il apparaisse après la popup
        const contourDelay = 0.2;

        return (
          <>

            {/* 🎴 Popup glassmorphism */}
            <div
              ref={destinationPopupRef}
              onClick={(e) => e.stopPropagation()}
              className={`absolute bg-white/10 backdrop-blur-lg text-white rounded-xl shadow-2xl pointer-events-auto 
                ${isPanelOpen
                  ? 'p-3 w-[85%] max-w-[200px] text-xs sm:p-3 sm:max-w-[220px] md:p-4 md:max-w-[240px]'
                  : 'p-4 w-[90%] max-w-[280px] text-xs sm:p-5 sm:w-[88%] sm:max-w-[320px] sm:text-sm md:p-6 md:max-w-[360px] md:text-base lg:p-8 lg:max-w-[420px]'
                }`}
              style={{
                top: isMobile ? '8%' : (isPanelOpen ? '15%' : `${popupPosition.top}%`),
                left: isMobile ? '4%' : (isPanelOpen ? '30%' : `${popupPosition.left}%`),
                zIndex: 50,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                borderColor: 'transparent',
                borderWidth: '3px',
                borderStyle: 'solid',
                willChange: 'transform, opacity',
                animation: isClosingDestination
                  ? undefined
                  : `drawBorder ${POPUP_ANIMATION_DURATION_S}s cubic-bezier(0.4, 0.12, 0.26, 0.96) ${contourDelay}s forwards`,
                // 🎬 Transitions smooth pour apparition/disparition
                opacity: isClosingDestination ? 0 : (isAppearingDestination ? 1 : 0),
                transform: isClosingDestination
                  ? 'translateY(-24px) scale(0.94)'
                  : (isAppearingDestination ? 'translateY(0) scale(1)' : 'translateY(-22px) scale(0.97)'),
                transition: `opacity ${POPUP_ANIMATION_DURATION_S}s cubic-bezier(0.33, 1, 0.68, 1), transform ${POPUP_ANIMATION_DURATION_S}s cubic-bezier(0.33, 1, 0.68, 1)`
              }}
            >
              {/* Bouton de fermeture */}
              <button
                onClick={() => {
                  setIsClosingDestination(true)
                  if (destinationPopupTimeoutRef.current) {
                    clearTimeout(destinationPopupTimeoutRef.current)
                    destinationPopupTimeoutRef.current = null
                  }
                  setTimeout(() => {
                    setAutoShowDestinationInfo(null)
                    setDestinationPopupDimensions(null)
                    setDestinationLineLength(0)
                    setIsClosingDestination(false)
                  }, TIMINGS.popupFadeOutMs)
                }}
                className={`cursor-pointer absolute top-1 right-1 w-12 h-12 flex items-center justify-center text-2xl text-gray-300 hover:text-white transition-colors duration-150 font-bold touch-manipulation`}
              >
                ×
              </button>

              <div className="pr-8">
                <h3 className={`${isSmallMobile ? 'text-lg mb-3' : isMobile ? 'text-xl mb-4' : isTablet ? 'text-xl mb-5' : 'text-2xl mb-6'} font-bold ${autoShowDestinationInfo.type === "work" ? "text-blue-300" : "text-red-300"
                  }`}>{autoShowDestinationInfo.name}</h3>
              </div>

              <div className={`overflow-y-auto ${isSmallMobile ? 'max-h-[200px]' : isMobile ? 'max-h-[250px]' : isTablet ? 'max-h-[300px]' : isPanelOpen ? 'max-h-[450px]' : 'max-h-[400px]'} ${isSmallMobile ? 'space-y-2' : isMobile ? 'space-y-3' : 'space-y-4'} ${isSmallMobile ? 'text-xs' : isMobile ? 'text-sm' : 'text-base'}`}>
                {autoShowDestinationInfo.type === "work" ? (
                  <>
                    <div>
                      <span className={`font-semibold text-blue-300 block ${isSmallMobile ? 'mb-1' : 'mb-2'}`}>Period</span>
                      <p className="text-gray-100">{autoShowDestinationInfo.info.period}</p>
                    </div>

                    <div>
                      <span className={`font-semibold text-blue-300 block ${isSmallMobile ? 'mb-1' : 'mb-2'}`}>Mission</span>
                      <p className="text-gray-100">{autoShowDestinationInfo.info.description}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className={`font-semibold text-blue-300 block ${isSmallMobile ? 'mb-1' : 'mb-2'}`}>Period</span>
                      <p className="text-gray-100">{autoShowDestinationInfo.info.period}</p>
                    </div>

                    <div>
                      <span className={`font-semibold text-blue-300 block ${isSmallMobile ? 'mb-1' : 'mb-2'}`}>Program</span>
                      <p className="text-gray-100">{autoShowDestinationInfo.info.description}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* Panneau d'informations - design glassmorphism avec animation */}
      {(() => {
        if (!selectedCity || autoShowDestinationInfo) return null;

        let projectedPoint: [number, number] | null = null;
        if (cityLineReady) {
          if (cityLineAnchor) {
            projectedPoint = [cityLineAnchor.x, cityLineAnchor.y];
          } else if (projectionRef.current) {
            const live = projectionRef.current([selectedCity.lng, selectedCity.lat]);
            projectedPoint = live ? [live[0], live[1]] : null;
          }
        }

        // 🎯 Calculer le rayon précis du point selon son type
        const scaleFactor = 1;
        const isChronological = chronologicalDestinations.some(d =>
          d.city === selectedCity.city || d.city === selectedCity.name
        );
        const pointRadius = getPointRadius(selectedCity, isChronological, scaleFactor);

        // Décaler le contour pour qu'il apparaisse après la popup
        const contourDelay = 0.2;

        return (
          <>

            {/* 🎴 Popup glassmorphism */}
            <div
              ref={cityPopupRef}
              className={`absolute bg-white/10 backdrop-blur-lg text-white rounded-xl shadow-2xl pointer-events-auto 
                ${isPanelOpen
                  ? 'p-3 w-[85%] max-w-[200px] text-xs sm:p-3 sm:max-w-[220px] md:p-4 md:max-w-[240px]'
                  : 'p-4 w-[90%] max-w-[280px] text-xs sm:p-5 sm:w-[88%] sm:max-w-[320px] sm:text-sm md:p-6 md:max-w-[360px] md:text-base lg:p-8 lg:max-w-[420px]'
                }`}
              style={{
                top: isMobile ? '8%' : (isPanelOpen ? '15%' : `${popupPosition.top}%`),
                left: isMobile ? '4%' : (isPanelOpen ? '30%' : `${popupPosition.left}%`),
                zIndex: 50,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                borderColor: 'transparent',
                borderWidth: '3px',
                borderStyle: 'solid',
                willChange: 'transform, opacity',
                animation: isClosingCity
                  ? undefined
                  : `drawBorder ${POPUP_ANIMATION_DURATION_S}s cubic-bezier(0.4, 0.12, 0.26, 0.96) ${contourDelay}s forwards`,
                // 🎬 Transitions smooth pour apparition/disparition
                opacity: isClosingCity ? 0 : (isAppearingCity ? 1 : 0),
                transform: isClosingCity
                  ? 'translateY(-24px) scale(0.94)'
                  : (isAppearingCity ? 'translateY(0) scale(1)' : 'translateY(-22px) scale(0.97)'),
                transition: `opacity ${POPUP_ANIMATION_DURATION_S}s cubic-bezier(0.33, 1, 0.68, 1), transform ${POPUP_ANIMATION_DURATION_S}s cubic-bezier(0.33, 1, 0.68, 1)`,
                pointerEvents: isCityPopupInteractive ? 'auto' : 'none'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  if (!isCityPopupInteractive) {
                    return
                  }
                  if (dezoomFunction.current) {
                    dezoomFunction.current()
                  }
                }}
                className="cursor-pointer absolute top-1 right-1 w-12 h-12 flex items-center justify-center text-2xl text-gray-300 hover:text-white transition-colors duration-150 font-bold touch-manipulation"
              >
                ×
              </button>

              <div className="pr-8">
                <h3 className={`${isSmallMobile ? 'text-lg mb-3' : isMobile ? 'text-xl mb-4' : isTablet ? 'text-xl mb-5' : 'text-2xl mb-6'} font-bold ${selectedCity.type === "visited" ? "text-white" :
                  selectedCity.type === "work" ? "text-blue-300" : "text-red-300"
                  }`}>{selectedCity.name}</h3>
              </div>

              <div className={`overflow-y-auto ${isSmallMobile ? 'max-h-[200px]' : isMobile ? 'max-h-[250px]' : isTablet ? 'max-h-[300px]' : isPanelOpen ? 'max-h-[450px]' : 'max-h-[400px]'} ${isSmallMobile ? 'space-y-2' : isMobile ? 'space-y-3' : 'space-y-4'} ${isSmallMobile ? 'text-xs' : isMobile ? 'text-sm' : 'text-base'}`}>
                {selectedCity.type === "visited" ? (
                  <div>
                    <span className={`${isSmallMobile ? 'text-2xl' : isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-green-300`}>Visited</span>
                  </div>
                ) : selectedCity.type === "work" ? (
                  <>
                    <div>
                      <span className={`font-semibold text-blue-300 block ${isSmallMobile ? 'mb-1' : 'mb-2'}`}>Company</span>
                      <p className="text-gray-100">{selectedCity.info.company}</p>
                    </div>

                    <div>
                      <span className={`font-semibold text-blue-300 block ${isSmallMobile ? 'mb-1' : 'mb-2'}`}>Position</span>
                      <p className="text-gray-100">{selectedCity.info.position}</p>
                    </div>

                    <div>
                      <span className={`font-semibold text-blue-300 block ${isSmallMobile ? 'mb-1' : 'mb-2'}`}>Period</span>
                      <p className="text-gray-100">{selectedCity.info.period}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className={`font-semibold text-blue-300 block ${isSmallMobile ? 'mb-1' : 'mb-2'}`}>Institution</span>
                      <p className="text-gray-100">{selectedCity.info.school}</p>
                    </div>

                    <div>
                      <span className={`font-semibold text-blue-300 block ${isSmallMobile ? 'mb-1' : 'mb-2'}`}>Program</span>
                      <p className="text-gray-100">{selectedCity.info.program}</p>
                    </div>

                    <div>
                      <span className={`font-semibold text-blue-300 block ${isSmallMobile ? 'mb-1' : 'mb-2'}`}>Period</span>
                      <p className="text-gray-100">{selectedCity.info.period}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* Légende en bas à droite avec points coréens */}
      <div ref={legendContainerRef} className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 flex flex-col items-end gap-4 sm:gap-6">
        {/* Liste des pays si une catégorie est sélectionnée */}
        {categoryFilter && (
          <div
            ref={legendPopupRef}
            className={`bg-black/90 backdrop-blur-md rounded-2xl px-4 py-3 sm:px-6 sm:py-4 border border-orange-500/30 mb-4 relative pr-10 sm:pr-12 max-w-[90vw] sm:max-w-none ${isClosingLegend ? 'animate-fadeOutPopup' : 'animate-slideInFromRight'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton de fermeture */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Annuler animations en cours
                if (cityPopupTimeoutRef.current) {
                  clearTimeout(cityPopupTimeoutRef.current);
                  cityPopupTimeoutRef.current = null;
                }
                // Fermer avec animation
                setIsClosingLegend(true);
                setTimeout(() => {
                  setCategoryFilter(null);
                  setIsClosingLegend(false);
                }, 300);
              }}
              className="absolute top-1 right-1 w-12 h-12 flex items-center justify-center text-2xl text-gray-300 hover:text-white transition-colors duration-150 font-bold touch-manipulation z-10 cursor-pointer"
            >
              ×
            </button>

            <div className="flex items-center gap-4 mb-3">
              {/* Label de la catégorie avec la couleur */}
              <div className={`text-lg font-bold ${categoryFilter === 'visited' ? 'text-green-400' :
                categoryFilter === 'work' ? 'text-blue-400' : 'text-red-400'
                }`}>
                {categoryFilter === 'visited' ? 'Visited' : categoryFilter === 'work' ? 'Work' : 'Study'}
              </div>
              <div className={`w-3 h-3 rounded-full ${categoryFilter === 'visited' ? 'bg-green-500' :
                categoryFilter === 'work' ? 'bg-blue-500' : 'bg-red-500'
                }`} />
            </div>
            {/* Liste horizontale des pays */}
            <div className="flex flex-wrap gap-2 text-sm max-w-xs">
              {categoryFilter === 'visited' ? (
                // Liste des villes visitées (points verts) - cliquables - MÊMES données que les points
                CITIES_DATA
                  .filter(c => c.type === 'visited')
                  .map((city, index, arr) => {
                    const isCurrentCity = selectedCity?.name === city.name;
                    return (
                      <button
                        key={city.name}
                        onClick={() => navigateToCity(city)}
                        className={`whitespace-nowrap hover:text-green-300 cursor-pointer transition-colors ${isCurrentCity ? 'text-green-400 font-bold' : 'text-white'
                          }`}
                      >
                        {city.name.split(' -')[0]}{index < arr.length - 1 ? ',' : ''}
                      </button>
                    );
                  })
              ) : (
                // Liste des destinations étude/travail - MÊMES données que les points
                (() => {
                  const filtered = CITIES_DATA.filter(city => {
                    if (categoryFilter === 'work') return city.type === 'work';
                    if (categoryFilter === 'study') return city.type === 'study';
                    return false;
                  });

                  return filtered.map((city, index, arr) => {
                    const isCurrentCity = selectedCity?.name === city.name || autoShowDestinationInfo?.name?.includes(city.name.split(' -')[0]);
                    // const color = categoryFilter === 'work' ? 'blue' : 'red'; - unused

                    return (
                      <button
                        key={city.name}
                        onClick={() => navigateToCity(city)}
                        className={`whitespace-nowrap cursor-pointer transition-colors ${categoryFilter === 'work' ? 'hover:text-blue-300' : 'hover:text-red-300'
                          } ${isCurrentCity ? (categoryFilter === 'work' ? 'text-blue-400' : 'text-red-400') + ' font-bold' : 'text-white'
                          }`}
                      >
                        {city.name.split(' -')[0]}{index < arr.length - 1 ? ',' : ''}
                      </button>
                    );
                  });
                })()
              )}
            </div>
          </div>
        )}

        {/* Points de légende avec effet "Ticker Vertical" Continu Parfait & Aligné Droite */}
        <div className="flex flex-col gap-3">
          {(['visited', 'study', 'work'] as const).map((type) => {
            const data = LEGEND_DATA[type];
            const isSelected = categoryFilter === type;
            const isInactive = categoryFilter && !isSelected;

            // 2 copies exactes pour boucle infinie parfaite
            const loopedLabels = [...data.labels, ...data.labels];

            // Hauteur calculée dynamiquement pour animation parfaite
            const halfHeight = tickerHeights[type] || 0;

            return (
              <button
                key={type}
                data-legend-button={type}
                onClick={(event) => {
                  event.stopPropagation();
                  setCategoryFilter(isSelected ? null : type);
                }}
                className={`cursor-pointer flex flex-col items-center gap-0 group transition-opacity duration-300 ${isInactive ? 'opacity-40' : 'opacity-100'}`}
                title={`${data.labels[1]} Locations`}
              >
                {/* Fenêtre de texte - Alignée au centre au-dessus du point */}
                <div
                  className="h-[120px] overflow-hidden relative flex justify-center"
                  style={{
                    maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)'
                  }}
                >
                  {/* Conteneur animé - animation dynamique basée sur hauteur réelle */}
                  <div
                    ref={(el) => { tickerRefs.current[type] = el; }}
                    className="flex flex-col items-center animate-ticker-scroll"
                    style={{
                      willChange: 'transform',
                      '--ticker-height': `${halfHeight}px`,
                      gap: '15px'
                    } as React.CSSProperties}
                  >
                    {loopedLabels.map((label, i) => (
                      <div
                        key={i}
                        className="flex-shrink-0 flex items-center justify-center"
                      >
                        <span
                          className={`font-bold ${isSelected ? data.text : 'text-gray-500 group-hover:text-gray-300'} transition-colors duration-300`}
                          style={{
                            writingMode: 'vertical-rl',
                            textOrientation: 'mixed',
                            fontSize: '13px',
                            letterSpacing: '0.1em',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Point Coloré (En dessous) - Centré sous le texte */}
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${isSelected
                  ? `${data.color} ring-4 ring-opacity-30 scale-125`
                  : `${data.color} bg-opacity-60 group-hover:bg-opacity-100 group-hover:scale-110`
                  }`} style={{
                    boxShadow: isSelected ? `0 0 15px ${type === 'visited' ? '#22c55e' : type === 'study' ? '#ef4444' : '#3b82f6'}` : 'none'
                  }} />
              </button>
            );
          })}
        </div>
      </div>

    </div>
  )
}
