import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivity {
  _id?: string;
  name: string;
  description: string;
  time: string;
  timeSlot?: string;
  duration?: string;
  hasTicket?: boolean;
  ticketCost?: number;
  ticketInfo?: string;
  directLink?: string;
  lat?: number;
  lng?: number;
  imageUrl?: string;
  rating?: number;
  notes?: string;
  position: number;
}

export interface ITripDay {
  _id?: string;
  dayNumber: number;
  theme: string;
  activities: IActivity[];
  stay?: {
    name: string;
    description?: string;
    distanceFromRouteKm: number;
    pricePerNight?: number;
    rating?: number;
    location?: string;
    directLink: string;
    bikeFriendlyFeatures?: string[];
  };
  stayOptions?: Array<{
    name: string;
    description?: string;
    distanceFromRouteKm: number;
    pricePerNight?: number;
    rating?: number;
    location?: string;
    directLink: string;
    bikeFriendlyFeatures?: string[];
  }>;
  lunch?: {
    name: string;
    cuisine?: string;
    description?: string;
    distanceFromRouteKm: number;
    pricePerPerson?: number;
    directLink: string;
    location?: string;
  };
  dinner?: {
    name: string;
    cuisine?: string;
    description?: string;
    distanceFromRouteKm: number;
    pricePerPerson?: number;
    directLink: string;
    location?: string;
  };
  dayDistanceKm?: number;
  sectorInfo?: string;
}

export interface IExpense {
  _id?: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  currency: string;
  originalAmount: number;
  paidBy: string;
  splitWith: string[];
  perPersonSplit: number;
}

export interface IPackingItem {
  _id?: string;
  name: string;
  checked: boolean;
  category: string;
}

export interface ICollaborator {
  _id?: string;
  email: string;
  userId?: string;
  name?: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedAt?: Date;
  respondedAt?: Date;
}

export interface ITrip extends Document {
  userId?: string;
  destination: string;
  originCity: string;
  startDate: string;
  days: number;
  travelers: number;
  budgetLimit: number;
  transportMode?: 'bike' | 'car' | 'train' | 'flight';
  departureTime?: string;
  groupType?: 'solo' | 'couple' | 'friends' | 'family';
  tripVibe?: 'spiritual' | 'adventures' | 'nature' | 'cultural' | 'leisure';
  routeDistanceKm?: number;
  routeDurationHours?: number;
  bestRouteName?: string;
  isLongDistance?: boolean;
  intermediateNightStayNeeded?: boolean;
  intermediateNightStayNote?: string;
  pitstops?: any[];
  travellerNames: string[];
  collaboratorEmails?: string[];
  collaboratorUserIds?: string[];
  collaborators?: ICollaborator[];
  itinerary: ITripDay[];
  expenses: IExpense[];
  packingList: IPackingItem[];
  createdAt: Date;
  updatedAt: Date;
}

const PitstopSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['lunch', 'dinner', 'hotel', 'scenic'], default: 'lunch' },
  mealType: { type: String },
  atKm: { type: Number, default: 0 },
  distanceFromRouteKm: { type: Number, default: 1 },
  description: { type: String, default: '' },
  cuisine: { type: String },
  rating: { type: Number, default: 4.5 },
  reviewCount: { type: Number },
  pricePerPerson: { type: Number },
  pricePerNight: { type: Number },
  highlight: { type: String },
  location: { type: String },
  bikeFriendlyFeatures: [{ type: String }],
  lat: { type: Number },
  lng: { type: Number },
});

const ActivitySchema = new Schema<IActivity>({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  time: { type: String, default: 'Morning' },
  timeSlot: { type: String },
  duration: { type: String },
  hasTicket: { type: Boolean, default: false },
  ticketCost: { type: Number, default: 0 },
  ticketInfo: { type: String },
  directLink: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  imageUrl: { type: String },
  rating: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  position: { type: Number, default: 0 },
});

const TripDaySchema = new Schema<ITripDay>({
  dayNumber: { type: Number, required: true },
  theme: { type: String, default: '' },
  activities: [ActivitySchema],
  stay: {
    name: { type: String },
    description: { type: String },
    distanceFromRouteKm: { type: Number, default: 1 },
    pricePerNight: { type: Number },
    rating: { type: Number, default: 4.5 },
    location: { type: String },
    directLink: { type: String },
    bikeFriendlyFeatures: [{ type: String }],
  },
  lunch: {
    name: { type: String },
    cuisine: { type: String },
    description: { type: String },
    distanceFromRouteKm: { type: Number, default: 1 },
    pricePerPerson: { type: Number },
    directLink: { type: String },
    location: { type: String },
  },
  dinner: {
    name: { type: String },
    cuisine: { type: String },
    description: { type: String },
    distanceFromRouteKm: { type: Number, default: 1 },
    pricePerPerson: { type: Number },
    directLink: { type: String },
    location: { type: String },
  },
  dayDistanceKm: { type: Number },
  sectorInfo: { type: String },
});

const ExpenseSchema = new Schema<IExpense>({
  description: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  currency: { type: String, default: 'INR' },
  originalAmount: { type: Number, required: true },
  paidBy: { type: String, required: true },
  splitWith: [{ type: String }],
  perPersonSplit: { type: Number, required: true },
});

const PackingItemSchema = new Schema<IPackingItem>({
  name: { type: String, required: true },
  checked: { type: Boolean, default: false },
  category: { type: String, default: 'Essentials' },
});

const CollaboratorSchema = new Schema<ICollaborator>({
  email: { type: String, required: true, lowercase: true, trim: true },
  userId: { type: String },
  name: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  invitedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date },
});

const TripSchema = new Schema<ITrip>(
  {
    userId: { type: String },
    destination: { type: String, required: true },
    originCity: { type: String, default: '' },
    startDate: { type: String, default: '' },
    days: { type: Number, required: true },
    travelers: { type: Number, default: 1 },
    budgetLimit: { type: Number, default: 50000 },
    transportMode: { type: String, enum: ['bike', 'car', 'train', 'flight'], default: 'bike' },
    groupType: { type: String, enum: ['solo', 'couple', 'friends', 'family'], default: 'solo' },
    tripVibe: { type: String, enum: ['spiritual', 'adventures', 'nature', 'cultural', 'leisure'], default: 'nature' },
    routeDistanceKm: { type: Number },
    routeDurationHours: { type: Number },
    pitstops: [PitstopSchema],
    travellerNames: [{ type: String }],
    collaboratorEmails: [{ type: String, lowercase: true, trim: true }],
    collaboratorUserIds: [{ type: String }],
    collaborators: [CollaboratorSchema],
    itinerary: [TripDaySchema],
    expenses: [ExpenseSchema],
    packingList: [PackingItemSchema],
  },
  { timestamps: true }
);

// Prevent mongoose from compiling the model multiple times in development
const Trip: Model<ITrip> = mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema);

export default Trip;
