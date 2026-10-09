import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivity {
  _id?: string;
  name: string;
  description: string;
  time: string;
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

const ActivitySchema = new Schema<IActivity>({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  time: { type: String, default: 'Morning' },
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
