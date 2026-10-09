export interface TripActivity {
  id: string;
  name: string;
  description: string;
  time?: string; // e.g. "Morning", "Afternoon", "Evening"
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
}

export interface TripDay {
  dayNumber: number;
  theme: string;
  activities: TripActivity[];
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

export interface Trip {
  id: string;
  userId?: string;
  destination: string;
  originCity: string;
  startDate: string;
  days: number;
  travelers: number;
  budgetLimit: number;
  itinerary: TripDay[];
  expenses: TripExpense[];
  packingList: PackingItem[];
  travellerNames?: string[];
  collaboratorEmails?: string[];
  collaboratorUserIds?: string[];
  collaborators?: TripCollaborator[];
  createdAt: string;
}
