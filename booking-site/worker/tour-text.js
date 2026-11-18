import { sampleTours } from './catalog.js';

export const tourTextLimits = { title: 100, location: 100, summary: 240, itinerary: 2500, included: 1000 };

const translations = {
  boysun: {
    en: {
      title: 'Boysun Mountains', location: 'Boysun',
      summary: 'Mountain trails, centuries-old villages and the hospitality of Surkhandarya.',
      itinerary: 'Day 1 · Explore central Boysun, visit the local market and meet craftspeople.\nDay 2 · Walk in the foothills and stop at scenic viewpoints.',
      included: 'Local guide\nTransport along the route\nOne night in a guesthouse',
    },
    de: {
      title: 'Boysun-Gebirge', location: 'Boysun',
      summary: 'Bergpfade, jahrhundertealte Dörfer und die Gastfreundschaft von Surxondaryo.',
      itinerary: 'Tag 1 · Erkunden Sie Boysun, besuchen Sie den Markt und lernen Sie das örtliche Handwerk kennen.\nTag 2 · Wandern Sie am Fuß der Berge und genießen Sie die Aussicht.',
      included: 'Ortskundige Reiseleitung\nTransport entlang der Route\nEine Nacht im Gästehaus',
    },
  },
  termiz: {
    en: {
      title: 'Historic Termez', location: 'Termez',
      summary: 'Explore the Sultan Saodat complex and the Termez Archaeological Museum.',
      itinerary: 'Morning · Visit the Sultan Saodat architectural complex.\nAfternoon · Explore the Termez Archaeological Museum and walk through the city.',
      included: 'Local guide\nTransport along the route',
    },
    de: {
      title: 'Historisches Termiz', location: 'Termiz',
      summary: 'Entdecken Sie den Sultan-Saodat-Komplex und das Archäologische Museum von Termiz.',
      itinerary: 'Vormittags · Besichtigung des Sultan-Saodat-Komplexes.\nNachmittags · Besuch des Archäologischen Museums und Spaziergang durch Termiz.',
      included: 'Ortskundige Reiseleitung\nTransport entlang der Route',
    },
  },
  sangardak: {
    en: {
      title: 'Sangardak Waterfall', location: 'Sariosiyo',
      summary: 'Spend a day among the green cliffs and cool waters of the Sariosiyo gorge.',
      itinerary: 'Morning · Travel to Sangardak village.\nAfternoon · Hike to the waterfall and relax in nature.',
      included: 'Local guide\nTransport along the route',
    },
    de: {
      title: 'Sangardak-Wasserfall', location: 'Sariosiyo',
      summary: 'Verbringen Sie einen Tag in der grünen Schlucht von Sariosiyo und am kühlen Wasserfall.',
      itinerary: 'Vormittags · Fahrt ins Dorf Sangardak.\nNachmittags · Wanderung zum Wasserfall und Zeit zur Erholung.',
      included: 'Ortskundige Reiseleitung\nTransport entlang der Route',
    },
  },
  istanbul: {
    en: {
      title: 'Istanbul and the Bosphorus', location: 'Istanbul, Türkiye',
      summary: 'Visit Sultanahmet, historic markets and the shores of the Bosphorus between two continents.',
      itinerary: 'Day 1 · Arrive in Istanbul.\nDay 2 · Discover Sultanahmet Square and the historic center.\nDay 3 · Walk along the Bosphorus and visit the Spice Bazaar.\nDay 4 · Free time and departure.',
      included: 'Three hotel nights\nCity tour\nAirport transfer',
    },
    de: {
      title: 'Istanbul und der Bosporus', location: 'Istanbul, Türkei',
      summary: 'Entdecken Sie Sultanahmet, historische Märkte und das Ufer des Bosporus zwischen zwei Kontinenten.',
      itinerary: 'Tag 1 · Ankunft in Istanbul.\nTag 2 · Besichtigung des Sultanahmet-Platzes und der Altstadt.\nTag 3 · Spaziergang am Bosporus und Besuch des Gewürzbasars.\nTag 4 · Freizeit und Abreise.',
      included: 'Drei Übernachtungen im Hotel\nStadtführung\nFlughafentransfer',
    },
  },
  tbilisi: {
    en: {
      title: 'Tbilisi and Mtskheta', location: 'Tbilisi, Georgia',
      summary: 'Explore Tbilisi’s old neighborhoods, views of the Caucasus and the historic center of Mtskheta.',
      itinerary: 'Day 1 · Arrive in Tbilisi.\nDay 2 · Explore Old Tbilisi and Narikala Hill.\nDay 3 · Take a day trip to Mtskheta.\nDay 4 · Free time and departure.',
      included: 'Three hotel nights\nExcursion and guide\nAirport transfer',
    },
    de: {
      title: 'Tiflis und Mzcheta', location: 'Tiflis, Georgien',
      summary: 'Entdecken Sie die Altstadt von Tiflis, die Landschaft des Kaukasus und das historische Zentrum von Mzcheta.',
      itinerary: 'Tag 1 · Ankunft in Tiflis.\nTag 2 · Besichtigung der Altstadt und des Narikala-Hügels.\nTag 3 · Tagesausflug nach Mzcheta.\nTag 4 · Freizeit und Abreise.',
      included: 'Drei Übernachtungen im Hotel\nAusflug mit Reiseleitung\nFlughafentransfer',
    },
  },
};

const sampleById = new Map(sampleTours.map((tour) => [tour.id, tour]));

export function translatedTourFields(tour, language) {
  if (!tour || language === 'uz') return {};
  const stored = tour.translations && JSON.parse(tour.translations)[language];
  const original = sampleById.get(tour.id);
  const sample = translations[tour.id]?.[language];
  return Object.fromEntries(Object.keys(tourTextLimits).map((field) => [
    field, stored?.[field] || (sample && original[field] === tour[field] ? sample[field] : ''),
  ]));
}

export function localizeTour(tour, language) {
  const nonempty = Object.entries(translatedTourFields(tour, language)).filter(([, value]) => value);
  return { ...tour, ...Object.fromEntries(nonempty) };
}

export function bookingTitle(booking, language) {
  if (language === 'uz') return booking.tour_title;
  const stored = booking.tour_translations && JSON.parse(booking.tour_translations)[language];
  const original = sampleById.get(booking.tour_id);
  return stored || (original?.title === booking.tour_title && translations[booking.tour_id]?.[language]?.title) || booking.tour_title;
}
