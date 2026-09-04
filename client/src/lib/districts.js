/**
 * A small bundled gazetteer — enough places that the app is usable before any
 * backend exists.
 *
 * This is here for one specific reason. The location gate cannot be dismissed
 * without choosing a place, and its two normal paths both need something the
 * user may not have: GPS needs a permission grant that can be denied, and
 * search needs the API. Ship the gate without a third path and you have built
 * a dialog that some people cannot get out of.
 *
 * These are real district headquarters with real coordinates, chosen to span
 * the country's climate zones rather than its largest cities — a coastal
 * cyclone belt, the Gangetic flood plain, the arid west, the Himalayan north
 * and the peninsular south all appear, because the risk engine reads
 * differently in each and the demo should be able to show that.
 *
 * `zone` matches the risk engine's own zone names.
 */
export const DISTRICTS = [
  // --- arid west ---
  { id: 'd_udaipur', name: 'Udaipur', district: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lon: 73.7125, zone: 'plains' },
  { id: 'd_jaipur', name: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lon: 75.7873, zone: 'plains' },
  { id: 'd_jodhpur', name: 'Jodhpur', district: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lon: 73.0243, zone: 'arid' },
  { id: 'd_bikaner', name: 'Bikaner', district: 'Bikaner', state: 'Rajasthan', lat: 28.0229, lon: 73.3119, zone: 'arid' },

  // --- Gangetic plain ---
  { id: 'd_lucknow', name: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lon: 80.9462, zone: 'plains' },
  { id: 'd_varanasi', name: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lon: 82.9739, zone: 'plains' },
  { id: 'd_patna', name: 'Patna', district: 'Patna', state: 'Bihar', lat: 25.5941, lon: 85.1376, zone: 'plains' },
  { id: 'd_gorakhpur', name: 'Gorakhpur', district: 'Gorakhpur', state: 'Uttar Pradesh', lat: 26.7606, lon: 83.3732, zone: 'plains' },

  // --- Punjab / Haryana grain belt ---
  { id: 'd_kapriwas', name: 'Kapriwas', district: 'Rewari', state: 'Haryana', lat: 28.2435, lon: 76.8453, zone: 'plains', kind: 'village' },
  { id: 'd_rewari', name: 'Rewari', district: 'Rewari', state: 'Haryana', lat: 28.1920, lon: 76.6190, zone: 'plains' },
  { id: 'd_ludhiana', name: 'Ludhiana', district: 'Ludhiana', state: 'Punjab', lat: 30.9010, lon: 75.8573, zone: 'plains' },
  { id: 'd_karnal', name: 'Karnal', district: 'Karnal', state: 'Haryana', lat: 29.6857, lon: 76.9905, zone: 'plains' },
  { id: 'd_delhi', name: 'New Delhi', district: 'New Delhi', state: 'Delhi', lat: 28.6139, lon: 77.2090, zone: 'plains' },

  // --- Himalayan north ---
  { id: 'd_shimla', name: 'Shimla', district: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lon: 77.1734, zone: 'hills' },
  { id: 'd_dehradun', name: 'Dehradun', district: 'Dehradun', state: 'Uttarakhand', lat: 30.3165, lon: 78.0322, zone: 'hills' },
  { id: 'd_srinagar', name: 'Srinagar', district: 'Srinagar', state: 'Jammu & Kashmir', lat: 34.0837, lon: 74.7973, zone: 'hills' },

  // --- east coast, cyclone belt ---
  { id: 'd_puri', name: 'Puri', district: 'Puri', state: 'Odisha', lat: 19.8135, lon: 85.8312, zone: 'coastal' },
  { id: 'd_visakhapatnam', name: 'Visakhapatnam', district: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lon: 83.2185, zone: 'coastal' },
  { id: 'd_chennai', name: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707, zone: 'coastal' },
  { id: 'd_kolkata', name: 'Kolkata', district: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639, zone: 'coastal' },

  // --- west coast ---
  { id: 'd_mumbai', name: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777, zone: 'coastal' },
  { id: 'd_ratnagiri', name: 'Ratnagiri', district: 'Ratnagiri', state: 'Maharashtra', lat: 16.9902, lon: 73.3120, zone: 'coastal' },
  { id: 'd_kochi', name: 'Kochi', district: 'Ernakulam', state: 'Kerala', lat: 9.9312, lon: 76.2673, zone: 'coastal' },
  { id: 'd_panaji', name: 'Panaji', district: 'North Goa', state: 'Goa', lat: 15.4909, lon: 73.8278, zone: 'coastal' },

  // --- Deccan ---
  { id: 'd_pune', name: 'Pune', district: 'Pune', state: 'Maharashtra', lat: 18.5204, lon: 73.8567, zone: 'plateau' },
  { id: 'd_nagpur', name: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lon: 79.0882, zone: 'plateau' },
  { id: 'd_hyderabad', name: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', lat: 17.3850, lon: 78.4867, zone: 'plateau' },
  { id: 'd_bengaluru', name: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', lat: 12.9716, lon: 77.5946, zone: 'plateau' },
  { id: 'd_belagavi', name: 'Belagavi', district: 'Belagavi', state: 'Karnataka', lat: 15.8497, lon: 74.4977, zone: 'plateau' },

  // --- central ---
  { id: 'd_bhopal', name: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lon: 77.4126, zone: 'plains' },
  { id: 'd_indore', name: 'Indore', district: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lon: 75.8577, zone: 'plains' },
  { id: 'd_raipur', name: 'Raipur', district: 'Raipur', state: 'Chhattisgarh', lat: 21.2514, lon: 81.6296, zone: 'plains' },

  // --- west ---
  { id: 'd_ahmedabad', name: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lon: 72.5714, zone: 'plains' },
  { id: 'd_rajkot', name: 'Rajkot', district: 'Rajkot', state: 'Gujarat', lat: 22.3039, lon: 70.8022, zone: 'plains' },

  // --- north-east ---
  { id: 'd_guwahati', name: 'Guwahati', district: 'Kamrup Metro', state: 'Assam', lat: 26.1445, lon: 91.7362, zone: 'plains' },
  { id: 'd_shillong', name: 'Shillong', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.5788, lon: 91.8933, zone: 'hills' },
]

/**
 * Match on name, district or state, so "rajasthan" finds Udaipur and "kamrup"
 * finds Guwahati. Case- and diacritic-insensitive; deliberately a prefix-or-
 * contains match rather than a fuzzy one, because a wrong-but-confident match
 * on a place name is worse here than no match.
 */
export function searchDistricts(query, limit = 8) {
  const q = String(query || '').trim().toLowerCase()
  if (q.length < 1) return []
  const hit = (d) =>
    `${d.name} ${d.district} ${d.state}`.toLowerCase().includes(q)
  // Places whose *name* starts with the query rank above incidental matches.
  const starts = DISTRICTS.filter((d) => d.name.toLowerCase().startsWith(q))
  const rest = DISTRICTS.filter((d) => !starts.includes(d) && hit(d))
  return [...starts, ...rest].slice(0, limit)
}

/** Nearest bundled district to a GPS fix, so a fix always resolves to a name. */
export function nearestDistrict(lat, lon) {
  let best = null
  let bestD = Infinity
  for (const d of DISTRICTS) {
    // Equirectangular approximation. Over the few hundred kilometres that
    // matter here it is within a percent of the great-circle distance, and it
    // avoids trigonometry in a loop that runs on every fix.
    const x = (d.lon - lon) * Math.cos(((d.lat + lat) / 2) * (Math.PI / 180))
    const y = d.lat - lat
    const dist = Math.sqrt(x * x + y * y) * 111
    if (dist < bestD) {
      bestD = dist
      best = d
    }
  }
  return best ? { ...best, distanceKm: Math.round(bestD) } : null
}

export default DISTRICTS
