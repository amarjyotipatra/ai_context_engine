const USERS = {
  user_101: {
    id: 'user_101', name: 'Aarav Sharma', language: 'en', subscription: 'premium', tonePreference: 'motivational',
    birthDetails: { date: '1997-08-15', time: '09:35', place: 'Delhi' },
  },
};

const KUNDLIS = {
  user_101: {
    lagna: 'Libra', moonSign: 'Scorpio',
    currentDasha: { mahadasha: 'Rahu', antardasha: 'Mars' },
    houses: {
      6: { lord: 'Jupiter', strength: 'Average' },
      7: { lord: 'Mars', strength: 'Weak' },
      10: { lord: 'Moon', strength: 'Strong' },
    },
  },
};

const HOROSCOPES = {
  user_101: {
    career: 'Networking may bring new opportunities.',
    finance: 'Avoid risky investments.',
    health: 'Prioritize proper sleep.',
    relationship: 'Communication with your partner improves.',
  },
};

const PANCHANG = { date: '2026-08-01', tithi: 'Shukla Panchami', nakshatra: 'Rohini', yoga: 'Siddhi', karana: 'Bava' };

const clone = (value) => structuredClone(value);
const find = (collection, userId, resource) => {
  const value = collection[userId];
  if (!value) throw new Error(`${resource} not found for user`);
  return clone(value);
};

// Replace these functions with HTTP clients in production; their contracts stay unchanged.
export const mockUpstreams = {
  getUser: async (userId) => find(USERS, userId, 'user'),
  getKundli: async (userId) => find(KUNDLIS, userId, 'kundli'),
  getHoroscope: async (userId) => find(HOROSCOPES, userId, 'horoscope'),
  getPanchang: async () => clone(PANCHANG),
};
