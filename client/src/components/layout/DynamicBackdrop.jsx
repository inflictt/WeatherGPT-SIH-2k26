import { useMemo } from 'react'
import { useData } from '../../lib/DataContext'
import useTheme from '../../lib/useTheme'

/**
 * Dynamic meteorological wallpaper engine.
 * Automatically resolves realistic, high-definition atmospheric backdrops
 * corresponding to live weather conditions, day/night cycle, and active theme.
 */

const WALLPAPERS = {
  // 1. Clear / Sunny
  clear: {
    dark: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=2400&q=80',
    light: 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?auto=format&fit=crop&w=2400&q=80',
    gradientDark: 'linear-gradient(180deg, rgba(15, 16, 17, 0.92) 0%, rgba(18, 30, 49, 0.8) 25%, rgba(20, 52, 95, 0.35) 55%, rgba(15, 16, 17, 0.96) 100%)',
    gradientLight: 'linear-gradient(180deg, rgba(241, 245, 249, 0.86) 0%, rgba(224, 242, 254, 0.72) 35%, rgba(241, 245, 249, 0.96) 100%)',
  },
  // 2. Rain / Showers / Drizzle
  rain: {
    dark: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=2400&q=80',
    light: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=2400&q=80',
    gradientDark: 'linear-gradient(180deg, rgba(15, 16, 17, 0.94) 0%, rgba(18, 26, 36, 0.85) 25%, rgba(25, 45, 70, 0.45) 55%, rgba(15, 16, 17, 0.96) 100%)',
    gradientLight: 'linear-gradient(180deg, rgba(241, 245, 249, 0.88) 0%, rgba(203, 213, 225, 0.75) 40%, rgba(241, 245, 249, 0.98) 100%)',
  },
  // 3. Thunderstorm / Storm
  thunder: {
    dark: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?auto=format&fit=crop&w=2400&q=80',
    light: 'https://images.unsplash.com/photo-1514632595-4944383f2737?auto=format&fit=crop&w=2400&q=80',
    gradientDark: 'linear-gradient(180deg, rgba(15, 16, 17, 0.95) 0%, rgba(22, 20, 42, 0.88) 25%, rgba(45, 30, 80, 0.5) 55%, rgba(15, 16, 17, 0.98) 100%)',
    gradientLight: 'linear-gradient(180deg, rgba(241, 245, 249, 0.9) 0%, rgba(148, 163, 184, 0.8) 40%, rgba(241, 245, 249, 0.98) 100%)',
  },
  // 4. Overcast / Cloudy
  overcast: {
    dark: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=80',
    light: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=2400&q=80',
    gradientDark: 'linear-gradient(180deg, rgba(15, 16, 17, 0.94) 0%, rgba(20, 26, 34, 0.84) 22%, rgba(30, 50, 75, 0.4) 50%, rgba(15, 16, 17, 0.96) 100%)',
    gradientLight: 'linear-gradient(180deg, rgba(241, 245, 249, 0.88) 0%, rgba(226, 232, 240, 0.75) 40%, rgba(241, 245, 249, 0.98) 100%)',
  },
  // 5. Dust / Haze / Sandstorm / Smoke
  dust: {
    dark: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=2400&q=80',
    light: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=2400&q=80',
    gradientDark: 'linear-gradient(180deg, rgba(15, 16, 17, 0.93) 0%, rgba(38, 28, 18, 0.85) 25%, rgba(85, 55, 25, 0.4) 55%, rgba(15, 16, 17, 0.96) 100%)',
    gradientLight: 'linear-gradient(180deg, rgba(241, 245, 249, 0.88) 0%, rgba(254, 243, 199, 0.7) 40%, rgba(241, 245, 249, 0.98) 100%)',
  },
  // 6. Fog / Mist / Smog
  fog: {
    dark: 'https://images.unsplash.com/photo-1487621167305-5d248087c724?auto=format&fit=crop&w=2400&q=80',
    light: 'https://images.unsplash.com/photo-1485236715568-ddc5ee6ca227?auto=format&fit=crop&w=2400&q=80',
    gradientDark: 'linear-gradient(180deg, rgba(15, 16, 17, 0.94) 0%, rgba(25, 30, 36, 0.88) 25%, rgba(45, 55, 65, 0.45) 55%, rgba(15, 16, 17, 0.97) 100%)',
    gradientLight: 'linear-gradient(180deg, rgba(241, 245, 249, 0.9) 0%, rgba(241, 245, 249, 0.8) 40%, rgba(241, 245, 249, 0.98) 100%)',
  },
  // 7. Snow / Sleet
  snow: {
    dark: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?auto=format&fit=crop&w=2400&q=80',
    light: 'https://images.unsplash.com/photo-1517299321909-be09a977c07b?auto=format&fit=crop&w=2400&q=80',
    gradientDark: 'linear-gradient(180deg, rgba(15, 16, 17, 0.92) 0%, rgba(18, 28, 40, 0.82) 25%, rgba(40, 65, 95, 0.4) 55%, rgba(15, 16, 17, 0.96) 100%)',
    gradientLight: 'linear-gradient(180deg, rgba(241, 245, 249, 0.85) 0%, rgba(224, 231, 255, 0.7) 40%, rgba(241, 245, 249, 0.98) 100%)',
  },
}

function classifyCondition(condStr = '') {
  const c = condStr.toLowerCase()
  if (c.includes('thunder') || c.includes('lightning') || c.includes('storm') || c.includes('squall')) {
    return 'thunder'
  }
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) {
    return 'rain'
  }
  if (c.includes('snow') || c.includes('sleet') || c.includes('blizzard') || c.includes('ice')) {
    return 'snow'
  }
  if (c.includes('dust') || c.includes('sand') || c.includes('haze') || c.includes('smoke')) {
    return 'dust'
  }
  if (c.includes('fog') || c.includes('mist') || c.includes('smog')) {
    return 'fog'
  }
  if (c.includes('clear') || c.includes('sun') || c.includes('fair')) {
    return 'clear'
  }
  return 'overcast'
}

export default function DynamicBackdrop() {
  const { current } = useData()
  const { resolved } = useTheme()
  const isLight = resolved === 'light'

  const conditionKey = useMemo(() => {
    return classifyCondition(current?.condition || 'overcast')
  }, [current?.condition])

  const currentTheme = isLight ? 'light' : 'dark'
  const config = WALLPAPERS[conditionKey] || WALLPAPERS.overcast
  const imageUrl = isLight ? config.light : config.dark
  const gradient = isLight ? config.gradientLight : config.gradientDark

  return (
    <div
      className="fixed inset-0 -z-10 transition-all duration-700 pointer-events-none"
      style={{
        backgroundColor: isLight ? '#f1f5f9' : '#0f1011',
        backgroundImage: `${gradient}, url('${imageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
      }}
      aria-hidden="true"
    />
  )
}
