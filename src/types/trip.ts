export interface DayHotelStay {
  name: string;
  description?: string;
  distanceFromRouteKm: number; // strictly <= 8 km
  pricePerNight?: number;
  rating?: number;
  location?: string;
  directLink: string; // Direct booking / Google Maps redirect URL
  bikeFriendlyFeatures?: string[];
  checkIn?: string;
}

export interface DayMealStop {
  name: string;
  cuisine?: string;
  description?: string;
  distanceFromRouteKm: number; // strictly <= 8 km
  pricePerPerson?: number;
  directLink: string; // Direct place / Google Maps redirect URL
  location?: string;
  rating?: number;
}

export interface TripActivity {
  id: string;
  name: string;
  description: string;
  time?: string; // e.g. "Morning", "Afternoon", "Evening"
  timeSlot?: string; // e.g. "09:00 AM - 11:00 AM" or "02:00 PM - 06:00 PM"
  duration?: string; // e.g. "1 hour", "2 hours", "4 hours"
  hasTicket?: boolean; // true if entry ticket needed
  ticketCost?: number; // entry ticket cost in INR (0 = free)
  ticketInfo?: string; // e.g. "Free Entry", "₹250 per person", "₹50 (Indians) / ₹300 (Foreigners)"
  directLink?: string; // Direct redirect to Google Maps / attraction website
  lat?: number;
  lng?: number;
  imageUrl?: string;
  rating?: number;
  notes?: string;
  // Optional itinerary enrichment supplied by the AI / routing provider.
  // The mind map consumes these directly when present; no separate map dataset.
  openingHours?: string;
  estimatedVisitDuration?: string;
  distanceFromPrevious?: string;
  travelTimeFromPrevious?: string;
  transportType?: string;
  price?: string | number;
  cuisine?: string;
  location?: string;
  checkIn?: string;
  checkOut?: string;
  category?: "sightseeing" | "meal" | "stay" | "transport";
  mealType?: "Lunch" | "Dinner";
}

export interface TripDay {
  dayNumber: number;
  theme: string;
  activities: TripActivity[];
  stay?: DayHotelStay;
  stayOptions?: DayHotelStay[]; // 2-3 hotel options within 8 km radius
  lunch?: DayMealStop;
  dinner?: DayMealStop;
  dayDistanceKm?: number;
  sectorInfo?: string;
}

export interface TripExpense {
  id: string;
  description: string;
  category: "Flights" | "Hotels" | "Food" | "Activities" | "Shopping & Misc";
  amount: number;
  date?: string;
  currency?: string;
  originalAmount?: number;
  paidBy?: string;
  splitWith?: string[];
  perPersonSplit?: number;
}

export interface PackingItem {
  id: string;
  category: string;
  name: string;
  checked: boolean;
}

export interface TripCollaborator {
  id?: string;
  email: string;
  userId?: string;
  name?: string;
  status: "pending" | "accepted" | "declined";
  invitedAt?: string;
  respondedAt?: string;
}

export interface TripPitstop {
  id: string;
  name: string;
  type: "lunch" | "dinner" | "hotel" | "scenic";
  mealType?: "Lunch" | "Dinner";
  atKm: number;
  distanceFromRouteKm: number; // Strictly <= 8 km
  description: string;
  cuisine?: string;
  rating?: number;
  pricePerPerson?: number;
  pricePerNight?: number;
  highlight?: string;
  location?: string;
  bikeFriendlyFeatures?: string[];
  lat?: number;
  lng?: number;
}

export interface Trip {
  id: string;
  userId?: string;
  destination: string;
  originCity: string;
  startDate: string;
  days: number;
  travelers: number;
  budgetLimit: number;
  transportMode?: "bike" | "car" | "train" | "flight";
  departureTime?: string; // Default "08:00" for bike/car
  groupType?: "solo" | "couple" | "friends" | "family";
  tripVibe?: "spiritual" | "adventures" | "nature" | "cultural" | "leisure";
  routeDistanceKm?: number;
  routeDurationHours?: number;
  bestRouteName?: string;
  isLongDistance?: boolean;
  intermediateNightStayNeeded?: boolean;
  intermediateNightStayNote?: string;
  pitstops?: TripPitstop[];
  itinerary: TripDay[];
  expenses: TripExpense[];
  packingList: PackingItem[];
  travellerNames?: string[];
  collaboratorEmails?: string[];
  collaboratorUserIds?: string[];
  collaborators?: TripCollaborator[];
  createdAt: string;
}
