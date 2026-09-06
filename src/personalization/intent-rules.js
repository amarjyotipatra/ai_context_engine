// Adding an intent is data work: add its keywords, source recipe, and defaults here.
export const INTENT_RULES = {
  career: {
    keywords: ['job', 'career', 'work', 'promotion', 'role', 'company', 'business', 'profession', 'interview', 'switch'],
    primary: ['careerHoroscope', 'house10'], secondary: ['currentDasha', 'panchang'],
    excluded: ['relationshipHoroscope', 'healthHoroscope', 'financeHoroscope', 'house6', 'house7'],
  },
  relationship: {
    keywords: ['relationship', 'partner', 'marriage', 'love', 'dating', 'romance', 'spouse'],
    primary: ['relationshipHoroscope', 'house7'], secondary: ['moonSign', 'currentDasha'],
    excluded: ['careerHoroscope', 'healthHoroscope', 'financeHoroscope', 'house6', 'house10'],
  },
  health: {
    keywords: ['health', 'sleep', 'wellness', 'energy', 'fitness', 'stress', 'wellbeing'],
    primary: ['healthHoroscope', 'house6'], secondary: ['moonSign', 'panchang'],
    excluded: ['careerHoroscope', 'relationshipHoroscope', 'financeHoroscope', 'house7', 'house10'],
  },
  finance: {
    keywords: ['finance', 'money', 'investment', 'invest', 'salary', 'wealth', 'financial', 'expense', 'budget'],
    primary: ['financeHoroscope'], secondary: ['currentDasha', 'panchang'],
    excluded: ['careerHoroscope', 'relationshipHoroscope', 'healthHoroscope', 'house6', 'house7'],
  },
  general: {
    keywords: ['today', 'guidance', 'week', 'month', 'priority', 'focus', 'summary', 'overall'],
    primary: ['careerHoroscope', 'relationshipHoroscope', 'healthHoroscope', 'financeHoroscope', 'lagna', 'moonSign'],
    secondary: ['currentDasha', 'house6', 'house7', 'house10', 'panchang'], excluded: [],
  },
};

export const CONTEXT_CATALOG = {
  careerHoroscope: { label: 'Career Horoscope', requires: ['horoscope'], read: ({ horoscope }) => horoscope?.career },
  relationshipHoroscope: { label: 'Relationship Horoscope', requires: ['horoscope'], read: ({ horoscope }) => horoscope?.relationship },
  healthHoroscope: { label: 'Health Horoscope', requires: ['horoscope'], read: ({ horoscope }) => horoscope?.health },
  financeHoroscope: { label: 'Finance Horoscope', requires: ['horoscope'], read: ({ horoscope }) => horoscope?.finance },
  currentDasha: { label: 'Current Dasha', requires: ['kundli'], read: ({ kundli }) => kundli?.currentDasha },
  house6: { label: '6th House', requires: ['kundli'], read: ({ kundli }) => kundli?.houses?.[6] },
  house7: { label: '7th House', requires: ['kundli'], read: ({ kundli }) => kundli?.houses?.[7] },
  house10: { label: '10th House', requires: ['kundli'], read: ({ kundli }) => kundli?.houses?.[10] },
  lagna: { label: 'Lagna', requires: ['kundli'], read: ({ kundli }) => kundli?.lagna },
  moonSign: { label: 'Moon Sign', requires: ['kundli'], read: ({ kundli }) => kundli?.moonSign },
  panchang: { label: "Today's Panchang", requires: ['panchang'], read: ({ panchang }) => panchang },
};
