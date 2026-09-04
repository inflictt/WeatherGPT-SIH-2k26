/**
 * Official NDMA / SDMA Designated Disaster Relief & Cyclone Shelters Dataset
 * Spans major vulnerable coastal zones, flood plains, and urban centers across India.
 */
export const SHELTERS_DATABASE = [
  // Delhi NCR & Haryana
  {
    id: 'sh-del-01',
    name: 'District Community Disaster Relief Center, Rewari',
    type: 'Flood & Severe Weather Shelter',
    state: 'Haryana',
    district: 'Rewari',
    lat: 28.1928,
    lon: 76.6191,
    address: 'Near Mini Secretariat, Model Town, Rewari, Haryana 123401',
    capacity: 850,
    currentOccupancy: 0,
    status: 'STANDBY_READY',
    facilities: ['Backup Generator', 'Purified Water', 'Medical First-Aid', 'Emergency Rations'],
    helpline: '1077',
    contactPerson: 'DEOC In-Charge Rewari',
    phone: '+91-1274-225244'
  },
  {
    id: 'sh-del-02',
    name: 'Government Model Senior Secondary School Relief Hub',
    type: 'Community Evacuation Center',
    state: 'Haryana',
    district: 'Gurugram',
    lat: 28.4595,
    lon: 77.0266,
    address: 'Sector 4, Urban Estate, Gurugram, Haryana 122001',
    capacity: 1200,
    currentOccupancy: 0,
    status: 'STANDBY_READY',
    facilities: ['Solar Power Backup', 'RO Water Station', 'Disaster First-Aid Post'],
    helpline: '1077',
    contactPerson: 'District Relief Officer',
    phone: '+91-124-2322234'
  },
  {
    id: 'sh-del-03',
    name: 'NDMA Designated Flood Relief Camp, Kashmiri Gate',
    type: 'Urban Flood Shelter',
    state: 'Delhi',
    district: 'Central Delhi',
    lat: 28.6675,
    lon: 77.2285,
    address: 'Yamuna Floodplain Relief Complex, Inter-State Bus Terminal Area, Delhi',
    capacity: 2500,
    currentOccupancy: 120,
    status: 'OPERATIONAL',
    facilities: ['High-Capacity Boat Dock', 'Mobile Medical Clinic', 'Emergency Kitchen'],
    helpline: '1077',
    contactPerson: 'Delhi Disaster Management Authority',
    phone: '+91-11-23860228'
  },

  // Coastal Odisha & West Bengal (Cyclone & Flood Belt)
  {
    id: 'sh-od-01',
    name: 'NCRMP Multipurpose Cyclone Shelter, Puri Coastal Hub',
    type: 'Multipurpose Cyclone Shelter (MPCS)',
    state: 'Odisha',
    district: 'Puri',
    lat: 19.8135,
    lon: 85.8312,
    address: 'Sea Beach Road, Pentakota Coastal Sector, Puri, Odisha 752002',
    capacity: 2000,
    currentOccupancy: 0,
    status: 'STANDBY_READY',
    facilities: ['Reinforced Concrete Dome', 'Helipad Access', 'Independent Solar Microgrid', 'Ham Radio Station'],
    helpline: '1070',
    contactPerson: 'OSDMA Puri Center',
    phone: '+91-6752-223201'
  },
  {
    id: 'sh-wb-01',
    name: 'Sundarbans Cyclone & Tidal Surge Shelter, Digha',
    type: 'Multipurpose Cyclone Shelter',
    state: 'West Bengal',
    district: 'Purba Medinipur',
    lat: 21.6266,
    lon: 87.5074,
    address: 'Coastal High Road, New Digha, West Bengal 721463',
    capacity: 1800,
    currentOccupancy: 0,
    status: 'STANDBY_READY',
    facilities: ['Elevated Stilt Foundation', 'Emergency Medical Ward', 'Desalination Water Unit'],
    helpline: '1070',
    contactPerson: 'Disaster Management Officer Digha',
    phone: '+91-3220-266222'
  },

  // Coastal Tamil Nadu & Andhra Pradesh
  {
    id: 'sh-tn-01',
    name: 'TNSDMA Coastal Storm Surge Shelter, Marina-Santhome',
    type: 'Coastal Storm & Flood Relief Shelter',
    state: 'Tamil Nadu',
    district: 'Chennai',
    lat: 13.0336,
    lon: 80.2785,
    address: 'Santhome High Road, Mylapore Coastal Division, Chennai 600004',
    capacity: 1500,
    currentOccupancy: 0,
    status: 'STANDBY_READY',
    facilities: ['High-Power Diesel Generator', 'Mobile Medical Van Base', 'Sanitation Blocks'],
    helpline: '1077',
    contactPerson: 'Greater Chennai Corporation Disaster Cell',
    phone: '+91-44-25619206'
  },
  {
    id: 'sh-ap-01',
    name: 'Visakhapatnam Cyclone & Heavy Weather Community Shelter',
    type: 'Multipurpose Cyclone Shelter',
    state: 'Andhra Pradesh',
    district: 'Visakhapatnam',
    lat: 17.7291,
    lon: 83.3323,
    address: 'Beach Road, MVP Colony Sector, Visakhapatnam, AP 530017',
    capacity: 1600,
    currentOccupancy: 0,
    status: 'STANDBY_READY',
    facilities: ['Satellite Comm Link', 'Food Storage Warehouse', 'Clean Drinking Water Plant'],
    helpline: '1070',
    contactPerson: 'APSDMA Vizag Unit',
    phone: '+91-891-2560000'
  },

  // Western Belt (Maharashtra & Gujarat)
  {
    id: 'sh-mh-01',
    name: 'MCGM Emergency Disaster Relief Shelter, Dadar',
    type: 'Urban Monsoon & Cyclone Evacuation Shelter',
    state: 'Maharashtra',
    district: 'Mumbai',
    lat: 19.0178,
    lon: 72.8478,
    address: 'Shivaji Park Sports Complex, Dadar West, Mumbai 400028',
    capacity: 3000,
    currentOccupancy: 0,
    status: 'STANDBY_READY',
    facilities: ['High-Capacity Generator', 'Emergency Medical Ward', 'Food Distribution Center'],
    helpline: '1916',
    contactPerson: 'BMC Disaster Management Control Room',
    phone: '+91-22-22694725'
  },
  {
    id: 'sh-gj-01',
    name: 'GSDMA Coastal Cyclone Shelter, Porbandar',
    type: 'Multipurpose Cyclone Shelter',
    state: 'Gujarat',
    district: 'Porbandar',
    lat: 21.6417,
    lon: 69.6293,
    address: 'Chowpatty Beach Sector, Porbandar, Gujarat 360575',
    capacity: 1400,
    currentOccupancy: 0,
    status: 'STANDBY_READY',
    facilities: ['Storm-Resistant Concrete Shell', 'Heavy Pump Drainage', 'Medical Post'],
    helpline: '1077',
    contactPerson: 'District Disaster Cell Porbandar',
    phone: '+91-286-2244444'
  }
]

/**
 * Calculates distance in kilometers between two GPS coordinate points (Haversine formula).
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

/**
 * Finds nearest shelters to a given location, sorted by distance.
 */
export function getNearbyShelters(userLat, userLon, limit = 5) {
  const lat = Number(userLat) || 28.6139
  const lon = Number(userLon) || 77.2090

  return SHELTERS_DATABASE.map((shelter) => {
    const distanceKm = calculateDistanceKm(lat, lon, shelter.lat, shelter.lon)
    return {
      ...shelter,
      distanceKm,
      navigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lon}`
    }
  })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
}
