import { useEffect, useState, useCallback, useRef } from "react";
import { Trip, TripActivity, TripDay, TripExpense, PackingItem } from "@/types/trip";
export type { Trip, TripActivity, TripDay, TripExpense, PackingItem };

// Global subscribers list to notify state updates across hooks
const listeners = new Set<(changedTripId?: string) => void>();

function emitChange(tripId?: string) {
  listeners.forEach((listener) => {
    try {
      listener(tripId);
    } catch (err) {
      console.error("Error in store listener:", err);
    }
  });
}

// -----------------------------------------------------------------------------
// LOCAL STORAGE CACHE HELPERS
// -----------------------------------------------------------------------------
export function getSavedTrips(): Trip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("tripmitra_trips");
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to parse cached trips:", err);
    return [];
  }
}

// Silent local storage update (does NOT emitChange to prevent infinite fetch loops)
export function saveTripsSilently(trips: Trip[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("tripmitra_trips", JSON.stringify(trips));
  } catch (err) {
    console.error("Failed to cache trips locally:", err);
  }
}

export function saveTrips(trips: Trip[]) {
  saveTripsSilently(trips);
  emitChange();
}

// -----------------------------------------------------------------------------
// MONGODB API HELPERS
// -----------------------------------------------------------------------------

export async function createMongoTrip(
  tripData: Omit<Trip, "id" | "expenses" | "packingList" | "createdAt">
): Promise<Trip> {
  const response = await fetch("/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...tripData, expenses: [], packingList: [] }),
  });
  const data = await response.json();
  if (!response.ok) {
    // If unauthorized or offline, create a local fallback trip
    if (response.status === 401) {
      return createLocalTrip(tripData);
    }
    throw new Error(data.error || "Could not save trip to MongoDB");
  }
  const created = data.trip as Trip;
  const currentTrips = getSavedTrips().filter((t) => t.id !== created.id);
  saveTripsSilently([created, ...currentTrips]);
  emitChange(created.id);
  return created;
}

export async function getMongoTrips(): Promise<Trip[]> {
  try {
    const response = await fetch("/api/trips", { cache: "no-store" });
    if (!response.ok) {
      return getSavedTrips();
    }
    const data = await response.json();
    const trips = (data.trips || []) as Trip[];
    saveTripsSilently(trips);
    return trips;
  } catch {
    return getSavedTrips();
  }
}

export async function getMongoInvitations(): Promise<Trip[]> {
  try {
    const response = await fetch("/api/trips", { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.invitations || []) as Trip[];
  } catch {
    return [];
  }
}

export async function respondToInvitation(tripId: string, action: "accept" | "decline"): Promise<void> {
  const response = await fetch(`/api/trips/${tripId}/respond-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to respond to invitation");
  }
  emitChange(tripId);
}

export async function fetchMongoTrip(tripId: string): Promise<Trip | null> {
  if (!tripId) return null;
  try {
    if (/^[a-f\d]{24}$/i.test(tripId)) {
      const res = await fetch(`/api/trips/${tripId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        return data.trip as Trip;
      }
    }
  } catch (err) {
    console.warn("Could not fetch trip from MongoDB, falling back to local cache:", err);
  }
  const cached = getSavedTrips().find((t) => t.id === tripId);
  return cached || null;
}

export async function deleteMongoTrip(tripId: string): Promise<void> {
  // Update local cache immediately
  const trips = getSavedTrips().filter((t) => t.id !== tripId);
  saveTripsSilently(trips);
  emitChange(tripId);

  if (/^[a-f\d]{24}$/i.test(tripId)) {
    const response = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Could not delete trip from MongoDB");
    }
  }
}

// Local CRUD helper for guest fallback
export function createLocalTrip(
  tripData: Omit<Trip, "id" | "expenses" | "packingList" | "createdAt">
): Trip {
  const newTrip: Trip = {
    ...tripData,
    id: Math.random().toString(36).substring(2, 9),
    expenses: [],
    packingList: [],
    createdAt: new Date().toISOString(),
  };
  const currentTrips = getSavedTrips();
  saveTrips([newTrip, ...currentTrips]);
  return newTrip;
}

export function updateLocalTripRecord(updatedTrip: Trip) {
  const trips = getSavedTrips();
  const idx = trips.findIndex((t) => t.id === updatedTrip.id);
  if (idx !== -1) {
    trips[idx] = updatedTrip;
  } else {
    trips.unshift(updatedTrip);
  }
  saveTripsSilently(trips);
}

// Unified CRUD: Update an entire trip record in MongoDB and local cache
export async function updateTripRecord(updatedTrip: Trip) {
  updateLocalTripRecord(updatedTrip);
  emitChange(updatedTrip.id);

  if (/^[a-f\d]{24}$/i.test(updatedTrip.id)) {
    try {
      await fetch(`/api/trips/${updatedTrip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTrip),
      });
    } catch (error) {
      console.error("Could not sync trip update to MongoDB:", error);
    }
  }
}

export function deleteLocalTrip(tripId: string) {
  void deleteMongoTrip(tripId);
}

// -----------------------------------------------------------------------------
// REACTIVE CUSTOM HOOK: useActiveTrip
// -----------------------------------------------------------------------------
export function useActiveTrip(tripId: string | null) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch current user auth state from MongoDB auth
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        setUser(data?.user || null);
      })
      .catch(() => setUser(null));
  }, []);

  // Fetch trips and active trip
  const syncState = useCallback(async () => {
    setIsLoading(true);
    try {
      const mongoTrips = await getMongoTrips();
      setTrips(mongoTrips);

      if (tripId) {
        const foundMongoTrip = await fetchMongoTrip(tripId);
        if (foundMongoTrip) {
          setTrip(foundMongoTrip);
        } else {
          const cached = mongoTrips.find((t) => t.id === tripId) || getSavedTrips().find((t) => t.id === tripId);
          setTrip(cached || null);
        }
      } else {
        setTrip(null);
      }
    } catch {
      const local = getSavedTrips();
      setTrips(local);
      setTrip(tripId ? local.find((t) => t.id === tripId) || null : null);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    syncState();

    const handleUpdate = (changedTripId?: string) => {
      // Only refetch if an external change targeted this trip or global list
      if (!changedTripId || changedTripId === tripId) {
        syncState();
      }
    };

    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, [tripId, syncState]);

  // Debounced sync to MongoDB
  const persistTrip = useCallback((updated: Trip) => {
    setTrip(updated);
    updateLocalTripRecord(updated);

    if (/^[a-f\d]{24}$/i.test(updated.id)) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetch(`/api/trips/${updated.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        }).catch((err) => console.error("MongoDB trip sync error:", err));
      }, 400);
    }
  }, []);

  // Activities CRUD
  const updateActivities = async (dayNumber: number, activities: TripActivity[]) => {
    if (!trip) return;
    const updatedItinerary = trip.itinerary.map((d) =>
      d.dayNumber === dayNumber ? { ...d, activities } : d
    );
    const updatedTrip = { ...trip, itinerary: updatedItinerary };
    persistTrip(updatedTrip);
  };

  const addActivity = async (
    dayNumber: number,
    name: string,
    description: string,
    time = "Morning",
    lat?: number,
    lng?: number,
    imageUrl?: string
  ) => {
    if (!trip) return;
    const day = trip.itinerary.find((d) => d.dayNumber === dayNumber);
    const newActivity: TripActivity = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      description,
      time,
      lat,
      lng,
      imageUrl,
    };
    const currentActivities = day ? day.activities : [];
    await updateActivities(dayNumber, [...currentActivities, newActivity]);
  };

  const editActivity = async (dayNumber: number, activityId: string, updatedFields: Partial<TripActivity>) => {
    if (!trip) return;
    const day = trip.itinerary.find((d) => d.dayNumber === dayNumber);
    if (!day) return;
    const updatedActivities = day.activities.map((a) =>
      a.id === activityId ? { ...a, ...updatedFields } : a
    );
    await updateActivities(dayNumber, updatedActivities);
  };

  const deleteActivity = async (dayNumber: number, activityId: string) => {
    if (!trip) return;
    const day = trip.itinerary.find((d) => d.dayNumber === dayNumber);
    if (!day) return;
    const filtered = day.activities.filter((a) => a.id !== activityId);
    await updateActivities(dayNumber, filtered);
  };

  // Days CRUD
  const addDay = async (theme = "") => {
    if (!trip) return;
    const nextDayNum = trip.itinerary.length + 1;
    const defaultTheme = theme || `Day ${nextDayNum}`;
    const newDay: TripDay = {
      dayNumber: nextDayNum,
      theme: defaultTheme,
      activities: [],
    };

    const updatedTrip = {
      ...trip,
      days: nextDayNum,
      itinerary: [...trip.itinerary, newDay],
    };
    persistTrip(updatedTrip);
  };

  const deleteDay = async (dayNumber: number) => {
    if (!trip) return;
    const filteredItinerary = trip.itinerary
      .filter((d) => d.dayNumber !== dayNumber)
      .map((d) => {
        if (d.dayNumber > dayNumber) {
          return { ...d, dayNumber: d.dayNumber - 1 };
        }
        return d;
      });

    const nextDaysCount = Math.max(0, trip.days - 1);
    const updatedTrip = {
      ...trip,
      days: nextDaysCount,
      itinerary: filteredItinerary,
    };
    persistTrip(updatedTrip);
  };

  // Expenses CRUD
  const addExpense = async (
    description: string,
    category: TripExpense["category"],
    amount: number,
    date?: string,
    currency = "INR",
    originalAmount?: number,
    paidBy?: string,
    splitWith?: string[]
  ) => {
    if (!trip) return;

    const getTravellerNames = (t: Trip) => {
      if (t.travellerNames && t.travellerNames.length > 0) {
        return t.travellerNames;
      }
      const names = ["You"];
      for (let i = 2; i <= t.travelers; i++) {
        names.push(`Traveler ${i}`);
      }
      return names;
    };

    const members = getTravellerNames(trip);
    const finalPaidBy = paidBy || members[0] || "You";
    const finalSplitWith = splitWith && splitWith.length > 0 ? splitWith : members;
    const share = amount / (finalSplitWith.length || 1);

    const newExpense: TripExpense = {
      id: Math.random().toString(36).substring(2, 9),
      description,
      category,
      amount,
      date: date || new Date().toISOString().split("T")[0],
      currency,
      originalAmount: originalAmount !== undefined ? originalAmount : amount,
      paidBy: finalPaidBy,
      splitWith: finalSplitWith,
      perPersonSplit: share,
    };
    const updatedTrip = { ...trip, expenses: [...trip.expenses, newExpense] };
    persistTrip(updatedTrip);
  };

  const deleteExpense = async (expenseId: string) => {
    if (!trip) return;
    const filtered = trip.expenses.filter((e) => e.id !== expenseId);
    const updatedTrip = { ...trip, expenses: filtered };
    persistTrip(updatedTrip);
  };

  const setBudgetLimit = async (limit: number) => {
    if (!trip) return;
    const updatedTrip = { ...trip, budgetLimit: limit };
    persistTrip(updatedTrip);
  };

  // Packing List CRUD
  const togglePackingItem = async (itemId: string) => {
    if (!trip) return;
    const updatedList = trip.packingList.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    const updatedTrip = { ...trip, packingList: updatedList };
    persistTrip(updatedTrip);
  };

  const addPackingItem = async (category: string, name: string) => {
    if (!trip) return;
    const newItem: PackingItem = {
      id: Math.random().toString(36).substring(2, 9),
      category,
      name,
      checked: false,
    };
    const updatedTrip = { ...trip, packingList: [...trip.packingList, newItem] };
    persistTrip(updatedTrip);
  };

  const deletePackingItem = async (itemId: string) => {
    if (!trip) return;
    const filtered = trip.packingList.filter((item) => item.id !== itemId);
    const updatedTrip = { ...trip, packingList: filtered };
    persistTrip(updatedTrip);
  };

  const setPackingSuggestions = async (categories: { category: string; items: string[] }[]) => {
    if (!trip) return;
    const generatedList: PackingItem[] = [];
    categories.forEach((cat) => {
      cat.items.forEach((itemText) => {
        generatedList.push({
          id: Math.random().toString(36).substring(2, 9),
          category: cat.category,
          name: itemText,
          checked: false,
        });
      });
    });
    const updatedTrip = { ...trip, packingList: generatedList };
    persistTrip(updatedTrip);
  };

  return {
    trip,
    trips,
    isLoading,
    user,
    addActivity,
    editActivity,
    deleteActivity,
    updateActivities,
    addExpense,
    deleteExpense,
    setBudgetLimit,
    togglePackingItem,
    addPackingItem,
    deletePackingItem,
    setPackingSuggestions,
    syncState,
    addDay,
    deleteDay,
  };
}

// -----------------------------------------------------------------------------
// HISTORICAL TRIP SEARCH UTILITIES
// -----------------------------------------------------------------------------
export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("tripmitra_search_history");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSearchQuery(query: string) {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const history = getSearchHistory();
    const filtered = history.filter((h) => h.toLowerCase() !== query.toLowerCase());
    const updated = [query.trim(), ...filtered].slice(0, 5); // Keep last 5 searches
    localStorage.setItem("tripmitra_search_history", JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save search history:", err);
  }
}
