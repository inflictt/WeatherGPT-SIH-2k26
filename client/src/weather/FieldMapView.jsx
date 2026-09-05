import { useEffect, useRef, useState } from 'react'
import Icon from '../ui/Icon'

const STATUS_COLORS = {
  healthy: { fill: '#10b981', stroke: '#059669', label: 'Healthy' },
  attention: { fill: '#f59e0b', stroke: '#d97706', label: 'Attention' },
  elevated: { fill: '#f97316', stroke: '#ea580c', label: 'Elevated Risk' },
  critical: { fill: '#ef4444', stroke: '#dc2626', label: 'Critical' },
}

export default function FieldMapView({
  fields = [],
  activeFieldId,
  onSelectField,
  location,
  lang = 'en',
}) {
  const el = useRef(null)
  const mapRef = useRef(null)
  const polygonsRef = useRef({})
  const [mapReady, setMapReady] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const isHindi = lang === 'hi'

  useEffect(() => {
    let cancelled = false

    async function initMap() {
      try {
        const L = (await import('leaflet')).default
        await import('leaflet/dist/leaflet.css')
        if (cancelled || !el.current || mapRef.current) return

        // Compute center: either average of field centroids or location coordinates
        let center = [location?.lat || 28.4595, location?.lon || 77.0265]
        if (fields.length > 0 && fields[0].boundary && fields[0].boundary.length > 0) {
          const b = fields[0].boundary
          center = [b[0][0], b[0][1]]
        }

        const map = L.map(el.current, {
          center,
          zoom: 16,
          scrollWheelZoom: false,
          attributionControl: false,
        })
        mapRef.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map)

        setMapReady(true)
      } catch (err) {
        console.error('Failed to load Leaflet map for fields:', err)
        setLoadError(true)
      }
    }

    initMap()

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [location?.lat, location?.lon])

  // Update field polygon overlays when fields or map changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    import('leaflet').then(({ default: L }) => {
      const map = mapRef.current
      if (!map) return

      // Clear existing polygons
      Object.values(polygonsRef.current).forEach((poly) => poly.remove())
      polygonsRef.current = {}

      const boundsGroup = []

      fields.forEach((f) => {
        if (!f.boundary || f.boundary.length < 3) return

        const status = f.healthStatus || 'healthy'
        const color = STATUS_COLORS[status] || STATUS_COLORS.healthy
        const isSelected = f.id === activeFieldId

        const polygon = L.polygon(f.boundary, {
          color: isSelected ? '#3b82f6' : color.stroke,
          weight: isSelected ? 3 : 2,
          fillColor: color.fill,
          fillOpacity: isSelected ? 0.45 : 0.25,
          dashArray: isSelected ? '4, 4' : null,
        }).addTo(map)

        polygon.bindTooltip(
          `<strong>${f.name}</strong><br/>${f.assignedCropName || 'No crop'} · ${f.areaHa || 1} ha`,
          { permanent: false, direction: 'center', className: 'field-tooltip' }
        )

        polygon.on('click', () => {
          if (onSelectField) onSelectField(f.id)
        })

        polygonsRef.current[f.id] = polygon
        boundsGroup.push(...f.boundary)
      })

      if (boundsGroup.length > 0) {
        try {
          map.fitBounds(L.latLngBounds(boundsGroup), { padding: [24, 24] })
        } catch {
          // fallback bounds
        }
      }
    })
  }, [mapReady, fields, activeFieldId, onSelectField])

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
      <div className="flex items-center justify-between border-b border-line bg-sunk/50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon name="map" size={15} className="text-accent" />
          <span className="text-caption font-semibold text-ink">
            {isHindi ? 'खेत सीमाएं और भू-मानचित्र' : 'Field Boundaries & Parcel Map'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-ink-3">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-sev-green" />
            {isHindi ? 'स्वस्थ' : 'Healthy'}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-sev-yellow" />
            {isHindi ? 'निगरानी' : 'Attention'}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-sev-orange" />
            {isHindi ? 'जोखिम' : 'Elevated'}
          </span>
        </div>
      </div>

      <div className="relative h-72 w-full bg-sunk">
        <div ref={el} className="h-full w-full" />

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 p-4 text-center">
            <Icon name="map" size={32} className="text-ink-3 mb-2" />
            <p className="text-caption font-semibold text-ink">
              {isHindi ? 'मानचित्र लोड नहीं हो सका' : 'Offline Map Mode'}
            </p>
            <p className="text-xs text-ink-3 mt-1 max-w-xs">
              {isHindi
                ? 'फ़ील्ड की सीमाएं और डेटा नीचे सूची में सुरक्षित हैं।'
                : 'Field boundaries and status are accessible in the parcel card view below.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
