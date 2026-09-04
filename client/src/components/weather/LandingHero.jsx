import { useNavigate } from 'react-router-dom'
import { useData } from '../../lib/DataContext'
import { formatters } from '../../lib/usePreferences'
import Reveal from '../ui/Reveal'

export default function LandingHero({ prefs, onOpenLocationModal }) {
  const navigate = useNavigate()
  const { current: c, location: LOCATION } = useData()
  const fmt = formatters(prefs?.units)

  const hasLocation = Boolean(LOCATION?.name)

  return (
    <section className="relative overflow-hidden">
      <div className="shell relative pb-2 pt-2">
        <Reveal>
          <div className="relative overflow-hidden rounded-[28px] border border-[#1e293b]/70 bg-[#090d16] shadow-2xl p-7 sm:p-10">
            {/* Cinematic Moody Storm Clouds Background */}
            <div
              className="absolute inset-0 -z-10 bg-cover bg-center opacity-40 mix-blend-screen scale-105 transform transition-transform duration-1000"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=2400&q=80')",
              }}
            />
            {/* Smooth dark vignette */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#070a10] via-[#090d16]/80 to-transparent" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#070a10]/90 via-transparent to-transparent" />

            <div className="relative z-10 flex flex-wrap items-end justify-between gap-8">
              <div className="space-y-4 max-w-2xl">
                {/* Clock / Requirement Tag */}
                <div className="flex items-center gap-2 font-mono text-xs text-[#38bdf8]">
                  <svg className="w-3.5 h-3.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                  </svg>
                  <span className="tracking-wide">
                    · {hasLocation ? `Live Atmospheric Telemetry: ${LOCATION.name}` : 'GPS / City Selection Required'}
                  </span>
                </div>

                {/* Big Title */}
                <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold font-display text-white tracking-tight leading-tight">
                  Good day, Atmospheric Intelligence.
                </h1>

                {/* Temperature and Awaiting Location Coordinates */}
                <div className="flex items-baseline gap-5 pt-1">
                  <span className="text-5xl sm:text-6xl lg:text-7xl font-light font-display text-white tracking-tighter">
                    {hasLocation && c?.tempC !== undefined ? `${fmt.temp(c.tempC)}°` : '__ °'}
                  </span>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-white font-mono text-sm sm:text-base font-bold">
                      <div className="h-5 w-5 rounded-full border border-[#38bdf8] flex items-center justify-center text-[#38bdf8]">
                        <div className="h-2 w-2 rounded-full bg-[#38bdf8]" />
                      </div>
                      <span>
                        {hasLocation ? `${LOCATION.name}, ${LOCATION.country || 'India'}` : 'Awaiting Location'}
                      </span>
                    </div>
                    <p className="text-xs text-[#94a3b8] font-mono leading-relaxed max-w-lg">
                      {hasLocation
                        ? `${c?.condition || 'Live observations active'} · Feels like ${fmt.temp(c?.feelsLikeC ?? 32)}° · Humidity ${c?.humidity ?? 65}%`
                        : 'Please select your city or enable GPS coordinates to load live atmospheric conditions.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5">
                <button
                  onClick={onOpenLocationModal}
                  className="rounded-2xl bg-[#00e5ff] hover:bg-[#00d0e8] text-black px-6 py-3.5 font-mono text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all shadow-lg shadow-[#00e5ff]/20 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="7" />
                    <circle cx="12" cy="12" r="2" fill="currentColor" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                  </svg>
                  <span>CHOOSE LOCATION (GPS)</span>
                </button>

                <button
                  onClick={() => navigate('/chat')}
                  className="rounded-2xl border border-[#1e293b] bg-[#111726]/90 hover:bg-[#162035] text-white px-5 py-3.5 font-mono text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all shadow-md backdrop-blur-md hover:border-[#38bdf8]/40 active:scale-95"
                >
                  <span className="text-[#38bdf8]">✨</span>
                  <span>ASK WEATHERGPT</span>
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
