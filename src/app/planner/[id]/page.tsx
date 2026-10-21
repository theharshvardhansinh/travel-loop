"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Users, MapPin, Plus, Trash2, Edit3, ChevronDown, ChevronUp,
  CloudSun, Briefcase, DollarSign, Navigation, Hotel, PlusCircle, ArrowUpDown,
  Sparkles, MessageSquare, Send, Globe, UserPlus, Mail, X, Check, UserCheck,
  Bike, Car, Train, Plane, Utensils, Fuel, Radar, ShieldCheck,
  ExternalLink, Clock, Ticket
} from "lucide-react";
import { useActiveTrip, TripActivity, updateTripRecord } from "@/lib/store";
import { RoadRouteResult, PitstopPlace } from "@/lib/roadRouteEngine";
import ExportButtons from "@/components/ExportButtons";
import AIChatAssistant from "@/components/AIChatAssistant";
import ImageWithFallback from "@/components/ImageWithFallback";
import TripHeader from "@/components/TripHeader";
import ScrollReveal from "@/components/ScrollReveal";
import ItineraryMindMap from "@/components/ItineraryMindMap";
import { requestAndSchedule } from "@/lib/notificationScheduler";

// Dynamic Import for Leaflet Map to avoid SSR 'window is not defined' compilation errors
const Map = dynamic(() => import("@/components/Map"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-gray-50 animate-pulse flex items-center justify-center text-gray-400 rounded-2xl border border-gray-200">
      Loading Interactive Map Router...
    </div>
  )
});

export default function PlannerPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const {
    trip,
    user,
    addActivity,
    editActivity,
    deleteActivity,
    togglePackingItem,
    addPackingItem,
    deletePackingItem,
    setPackingSuggestions,
    addExpense,
    updateActivities,
    addDay,
    deleteDay,
    syncState,
  } = useActiveTrip(tripId);

  // Active UI States
  const [activeDay, setActiveDay] = useState(1);
  const [plannerView, setPlannerView] = useState<"itinerary" | "mindmap" | "map">("itinerary");
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({ 1: true });
  const [activeSidebarTab, setActiveSidebarTab] = useState<"places" | "weather" | "deals" | "assistant" | "team">("places");

  // Co-Traveler states
  const [coTravelerEmail, setCoTravelerEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  // Stops Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [targetDay, setTargetDay] = useState(1);
  
  // Stop Form Values
  const [stopName, setStopName] = useState("");
  const [stopDesc, setStopDesc] = useState("");
  const [stopTime, setStopTime] = useState("Morning");
  const [stopImageUrl, setStopImageUrl] = useState("");
  const [journalMode, setJournalMode] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<TripActivity | null>(null);

  // Image Search States
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState<{ title: string; thumbnail: string; original: string }[]>([]);

  // Border Check State
  const [isInternational, setIsInternational] = useState<boolean | null>(null);

  // Geocoding State
  const [isGeocoding, setIsGeocoding] = useState(false);

  // AI Stop Suggestions States
  const [isSuggestingStops, setIsSuggestingStops] = useState(false);
  const [aiStopSuggestions, setAiStopSuggestions] = useState<{ name: string; description: string; time: string }[]>([]);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // Auto-schedule push notifications when a trip loads
  useEffect(() => {
    if (trip) {
      requestAndSchedule(trip).catch(err => console.warn("Failed to schedule reminders:", err));
    }
  }, [trip?.id, trip?.startDate]);

  useEffect(() => {
    if (!trip?.destination) return;
    const checkBorder = async () => {
      try {
        const res = await fetch("/api/check-border", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: trip.originCity || "Mumbai",
            destination: trip.destination
          })
        });
        if (res.ok) {
          const data = await res.json();
          setIsInternational(data.isInternational);
        }
      } catch (err) {
        console.error("Failed to check border:", err);
      }
    };
    checkBorder();
  }, [trip?.destination, trip?.originCity]);

  const handleSearchImages = async (queryText: string) => {
    const q = queryText || trip?.destination || "";
    if (!q.trim()) return;
    setIsSearchingImages(true);
    try {
      const res = await fetch(`/api/search-images?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setImageSearchResults(data.images || []);
      }
    } catch (err) {
      console.error("Failed to search images:", err);
    } finally {
      setIsSearchingImages(false);
    }
  };

  // Weather States
  const [weatherForecast, setWeatherForecast] = useState<any>(null);
  const [weatherAdvice, setWeatherAdvice] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Booking & Pitstop Deals States
  const [flightDeals, setFlightDeals] = useState<any[]>([]);
  const [trainDeals, setTrainDeals] = useState<any[]>([]);
  const [roadRoute, setRoadRoute] = useState<RoadRouteResult | null>(null);
  const [hotelDeals, setHotelDeals] = useState<any[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [dealSorting, setDealSorting] = useState<"price" | "rating">("price");
  const [pitstopFilter, setPitstopFilter] = useState<"all" | "lunch" | "dinner" | "hotel">("all");

  // Packing List input
  const [newPackingText, setNewPackingText] = useState("");

  // Chat Panel States
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { sender: "Rahul", text: "Hey! Did we finalize the hotel details?" },
    { sender: "Priya", text: "Yeah, Park Hyatt looks great. Just added the budget allocation!" },
    { sender: "Rahul", text: "Awesome. I'll check out the flights tonight." }
  ]);

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { sender: "Kunth", text: chatInput.trim() }]);
    setChatInput("");
  };

  const handleFocusAIAssistant = () => {
    setActiveSidebarTab("assistant");
    const el = document.getElementById("sidebar-utilities-container");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const moveActivity = async (dayNumber: number, index: number, direction: "up" | "down") => {
    if (!trip) return;
    const day = trip.itinerary.find((d) => d.dayNumber === dayNumber);
    if (!day) return;
    const activities = [...day.activities];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activities.length) return;

    const temp = activities[index];
    activities[index] = activities[targetIdx];
    activities[targetIdx] = temp;

    await updateActivities(dayNumber, activities);
  };

  // Fetch Weather Forecast and TripAdvisor Deals on Destination change
  useEffect(() => {
    if (!trip?.destination) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchWeatherData = async () => {
      setLoadingWeather(true);
      try {
        const res = await fetch(
          `/api/weather?destination=${encodeURIComponent(trip.destination)}&date=${trip.startDate}`,
          { signal }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setWeatherForecast(data);

        // Fetch AI Weather advice matching forecast
        if (data.forecast) {
          const adviceRes = await fetch("/api/ai/weather-advice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              destination: trip.destination,
              dates: trip.startDate,
              weather_summary: data.forecast.daily
            }),
            signal
          });
          if (adviceRes.ok) {
            const adviceData = await adviceRes.json();
            setWeatherAdvice(adviceData.weather_advice);
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Failed to load weather:", err);
        }
      } finally {
        if (!signal.aborted) {
          setLoadingWeather(false);
        }
      }
    };

    const fetchDealsData = async () => {
      setLoadingDeals(true);
      setFlightDeals([]);
      setTrainDeals([]);
      setHotelDeals([]);
      try {
        // 1. Fetch Transit / Road Pitstops depending on transportMode
        if (trip.transportMode === "bike" || trip.transportMode === "car") {
          const roadRes = await fetch(
            `/api/travel/road-route?origin=${encodeURIComponent(trip.originCity || "Mumbai")}&destination=${encodeURIComponent(
              trip.destination
            )}&mode=${trip.transportMode}&tripVibe=${trip.tripVibe || ""}`,
            { signal }
          );
          if (roadRes.ok) {
            const roadData = await roadRes.json();
            setRoadRoute(roadData);
          }
        } else if (trip.transportMode === "train") {
          const trainRes = await fetch("/api/travel/transit-options", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              origin: trip.originCity || "Mumbai",
              destination: trip.destination,
              mode: "train"
            }),
            signal
          });
          if (trainRes.ok) {
            const trainData = await trainRes.json();
            setTrainDeals(trainData.options || []);
          }
        } else {
          // Fetch flights deals
          const flightRes = await fetch(
            `/api/travel/flights?departure_id=${encodeURIComponent(trip.originCity || "Mumbai")}&arrival_id=${encodeURIComponent(
              trip.destination
            )}&outbound_date=${trip.startDate}`,
            { signal }
          );
          if (flightRes.ok) {
            const flightData = await flightRes.json();
            setFlightDeals(flightData.best_flights || []);
          }
        }

        // 2. Fetch hotels deals
        const checkOut = new Date(trip.startDate);
        checkOut.setDate(checkOut.getDate() + trip.days);
        const hotelRes = await fetch(
          `/api/travel/hotels?q=${encodeURIComponent(trip.destination)}&check_in_date=${
            trip.startDate
          }&check_out_date=${checkOut.toISOString().split("T")[0]}`,
          { signal }
        );
        if (hotelRes.ok) {
          const hotelData = await hotelRes.json();
          setHotelDeals(hotelData.properties || []);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Failed to load deals:", err);
        }
      } finally {
        if (!signal.aborted) {
          setLoadingDeals(false);
        }
      }
    };

    fetchWeatherData();
    fetchDealsData();

    return () => {
      controller.abort();
    };
  }, [trip?.id, trip?.destination, trip?.startDate, trip?.days, trip?.originCity]);

  // Load packing suggestions via AI if list is empty
  useEffect(() => {
    if (!trip || trip.packingList.length > 0) return;

    const fetchPackingSuggestions = async () => {
      try {
        const res = await fetch("/api/ai/packing-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: trip.destination,
            dates: trip.startDate,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.packing_suggestions?.categories) {
            setPackingSuggestions(data.packing_suggestions.categories);
          }
        }
      } catch (err) {
        console.error("Failed to load packing suggestions:", err);
      }
    };

    fetchPackingSuggestions();
  }, [trip?.destination, trip?.packingList.length]);

  // Auto-geocode initial generated activities if coordinates are missing.
  // Dependency: serialised list of IDs that still lack coords — so this only
  // re-fires when new unresolved activities appear, not on every trip update.
  const missingCoordIds = trip?.itinerary
    .flatMap((d) => d.activities)
    .filter((a) => typeof a.lat !== "number" || typeof a.lng !== "number")
    .map((a) => a.id)
    .join(",") ?? "";

  useEffect(() => {
    if (!trip || !missingCoordIds) return;

    const geocodeItinerary = async () => {
      setIsGeocoding(true);
      const missingCount = missingCoordIds.split(",").length;
      console.log(`[planner] Auto-geocoding ${missingCount} activities sequentially in "${trip.destination}"…`);
      
      let updated = false;
      const updatedItinerary = [];

      try {
        for (const day of trip.itinerary) {
          const updatedActivities = [];
          for (const act of day.activities) {
            if (typeof act.lat === "number" && typeof act.lng === "number") {
              updatedActivities.push(act);
              continue;
            }
            try {
              const url = `/api/geocode?place=${encodeURIComponent(act.name)}&location=${encodeURIComponent(trip.destination)}`;
              const res = await fetch(url);
              if (res.ok) {
                const coords = await res.json();
                console.log(`[planner] Sequential geocode hit for "${act.name}" → lat: ${coords.lat?.toFixed(5)}, lng: ${coords.lng?.toFixed(5)} (distinct check)`);
                updated = true;
                updatedActivities.push({ ...act, lat: coords.lat, lng: coords.lng });
              } else {
                console.warn(`[planner] Geocode HTTP ${res.status} for "${act.name}"`);
                updatedActivities.push(act);
              }
            } catch (err) {
              console.error(`[planner] Geocoding failed for "${act.name}":`, err);
              updatedActivities.push(act);
            }
          }
          updatedItinerary.push({ ...day, activities: updatedActivities });
        }

        if (updated) {
          // Log all resolved coordinates to console to verify they are distinct before rendering
          console.log("[planner] Final resolved geocoded positions check:");
          updatedItinerary.forEach((day) => {
            day.activities.forEach((act) => {
              console.log(`  Activity: "${act.name}" | Coord: ${act.lat ?? "N/A"}, ${act.lng ?? "N/A"}`);
            });
          });
          updateTripRecord({ ...trip, itinerary: updatedItinerary });
        }
      } finally {
        setIsGeocoding(false);
      }
    };

    geocodeItinerary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingCoordIds, trip?.destination]);


  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Finding your itinerary records...
      </div>
    );
  }

  // Handle Collapsible Day view
  const toggleDayExpansion = (dayNum: number) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayNum]: !prev[dayNum]
    }));
  };

  // Open modals
  const openAddModal = (dayNum: number) => {
    setTargetDay(dayNum);
    setStopName("");
    setStopDesc("");
    setStopTime("Morning");
    setStopImageUrl("");
    setImageSearchResults([]);
    setAiStopSuggestions([]);
    setSuggestError(null);
    setShowAddModal(true);
  };

  const openEditModal = (dayNum: number, activity: TripActivity) => {
    setTargetDay(dayNum);
    setSelectedActivity(activity);
    setStopName(activity.name);
    setStopDesc(activity.description);
    setStopTime(activity.time || "Morning");
    setStopImageUrl(activity.imageUrl || "");
    setImageSearchResults([]);
    setShowEditModal(true);
  };

  const fetchAiStopSuggestions = async () => {
    if (!trip) return;
    setIsSuggestingStops(true);
    setSuggestError(null);
    try {
      const activeDayData = trip.itinerary.find((d) => d.dayNumber === targetDay);
      const existingActivities = activeDayData?.activities.map((a) => a.name) || [];
      const allTripActivities = trip.itinerary.flatMap((d) => d.activities).map((a) => a.name);

      const res = await fetch("/api/ai/suggest-stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: trip.destination,
          dayNumber: targetDay,
          dayTheme: activeDayData?.theme || "",
          existingActivities,
          allTripActivities
        })
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      if (data.suggestions && data.suggestions.length > 0) {
        setAiStopSuggestions(data.suggestions);
      } else {
        setSuggestError("Could not fetch suggestions, try again");
      }
    } catch (err) {
      console.error("AI Stop suggestion failed:", err);
      setSuggestError("Could not fetch suggestions, try again");
    } finally {
      setIsSuggestingStops(false);
    }
  };

  // Geocode & Save Stops
  const handleSaveAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopName.trim()) return;

    try {
      const geoRes = await fetch(`/api/geocode?place=${encodeURIComponent(stopName)}&location=${encodeURIComponent(trip.destination)}`);
      if (geoRes.ok) {
        const coords = await geoRes.json();
        addActivity(targetDay, stopName, stopDesc, stopTime, coords.lat, coords.lng, stopImageUrl.trim() || undefined);
        setShowAddModal(false); // Only close modal on successful geocoding
      } else {
        alert("Could not find this location, try a more specific name");
      }
    } catch {
      alert("Could not find this location, try a more specific name");
    }
  };

  const handleSaveEditStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopName.trim() || !selectedActivity) return;

    try {
      const geoRes = await fetch(`/api/geocode?place=${encodeURIComponent(stopName)}&location=${encodeURIComponent(trip.destination)}`);
      if (geoRes.ok) {
        const coords = await geoRes.json();
        editActivity(targetDay, selectedActivity.id, {
          name: stopName,
          description: stopDesc,
          time: stopTime,
          lat: coords.lat,
          lng: coords.lng,
          imageUrl: stopImageUrl.trim() || undefined
        });
        setShowEditModal(false); // Only close modal on successful geocoding
      } else {
        alert("Could not find this location, try a more specific name");
      }
    } catch {
      alert("Could not find this location, try a more specific name");
    }
  };

  const handleAddHotelExpense = (hotel: any) => {
    const rawRate = hotel.rate_per_night?.lowest || "3000";
    const numericPrice = parseInt(rawRate.replace(/[^0-9]/g, "")) || 3000;
    
    addExpense(
      `Hotel Reservation: ${hotel.name}`,
      "Hotels",
      numericPrice * trip.days
    );
    alert(`Added ${hotel.name} expense allocation of Rs ${(numericPrice * trip.days).toLocaleString()} to Budget Ledger.`);
  };

  const handleAddFlightExpense = (flight: any) => {
    const numericPrice = flight.price || 5000;
    addExpense(
      `Flight: ${flight.flights?.[0]?.airline || "Transit Airline"}`,
      "Flights",
      numericPrice * trip.travelers
    );
    alert(`Added flight allocation of Rs ${(numericPrice * trip.travelers).toLocaleString()} to Budget Ledger.`);
  };

  const activeDayActivities = trip.itinerary.find((d) => d.dayNumber === activeDay)?.activities || [];

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 pt-20 pb-6 md:pt-32 md:pb-10 text-gray-800">
      
      {/* HEADER CONTROLS */}
      <TripHeader trip={trip} isInternational={isInternational} />

      {/* The itinerary remains the source of truth; these are presentation layers. */}
      <div className="mb-5 flex w-fit items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {([
          ["itinerary", "Itinerary"],
          ["mindmap", "Mind Map"],
          ["map", "Map"],
        ] as const).map(([view, label]) => (
          <button
            key={view}
            type="button"
            onClick={() => setPlannerView(view)}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${plannerView === view ? "bg-teal-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* THREE COLUMN WORKSPACE */}
      <div className={`grid grid-cols-1 gap-6 min-h-[70vh] ${plannerView === "mindmap" ? "lg:grid-cols-1" : "lg:grid-cols-[30%_45%_25%]"}`}>
        
        {/* COLUMN 1: DAY TIMELINE FEED */}
        <div className={plannerView === "mindmap" ? "hidden" : "flex flex-col gap-4"}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-gray-500">Day Timeline</h2>
            <span className="text-[10px] text-gray-400">Click day tab to focus map</span>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {trip.itinerary.map((day, idx) => {
              const isExpanded = expandedDays[day.dayNumber];
              const isActive = activeDay === day.dayNumber;

              return (
                <ScrollReveal key={day.dayNumber} delay={idx * 0.06}>
                  <div
                    className={`rounded-2xl border transition-all duration-300 ${
 isActive 
 ? "border-teal-500/30 bg-teal-50/50" 
 : "border-gray-200 bg-white hover:border-gray-300"
 }`}
                >
                  {/* Day Header */}
                  <div
                    onClick={() => {
                      setActiveDay(day.dayNumber);
                      toggleDayExpansion(day.dayNumber);
                    }}
                    className="flex items-center justify-between p-4 cursor-pointer"
                  >
                    <div>
                      <h3 className="text-sm font-bold font-display text-gray-800">
                        Day {day.dayNumber}
                      </h3>
                      <p className="text-[10px] text-gray-500 mt-0.5">{day.theme || "Sightseeing"}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddModal(day.dayNumber);
                        }}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-teal-600"
                        title="Add Activity Stop"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const confirmDelete = confirm(
                            `Are you sure you want to delete Day ${day.dayNumber}? This will permanently remove all of its activities.`
                          );
                          if (confirmDelete) {
                            deleteDay(day.dayNumber);
                          }
                        }}
                        className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title={`Delete Day ${day.dayNumber}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </div>

                  {/* Day Activities Collapsible content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
                      {/* Day Dedicated Hotel Stay & Meals Deck (8 km Radius Corridor) */}
                      {(day.stay || day.lunch || day.dinner || trip.transportMode === "bike" || trip.transportMode === "car") && (
                        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50/70 via-teal-50/40 to-indigo-50/60 border border-amber-200/70 text-left mt-2 shadow-2xs">
                          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5 pb-1.5 border-b border-amber-200/60">
                            <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-800">
                              <span className="p-1 rounded-md bg-amber-500/10 text-amber-700">
                                {trip.transportMode === "bike" ? <Bike className="w-3.5 h-3.5" /> : <Car className="w-3.5 h-3.5" />}
                              </span>
                              <span>Day {day.dayNumber} Stay & Highway Pitstops (Within 8 km Corridor)</span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                              {day.sectorInfo || `Sector Reach: ~${day.dayDistanceKm || (trip.routeDistanceKm || 300)} km`}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {/* Night Stay Hotel - Different for each day */}
                            <div className="p-2.5 rounded-lg bg-white/95 border border-teal-200 shadow-xs flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between text-[9px] font-black text-teal-700 uppercase tracking-wider mb-1">
                                  <span className="flex items-center gap-1">🏨 Night Stay</span>
                                  <span className="text-amber-600 font-bold">★ {day.stay?.rating || 4.6}</span>
                                </div>
                                <h5 className="text-xs font-black text-slate-900 line-clamp-1">{day.stay?.name || `${trip.destination} Traveler's Haven`}</h5>
                                <p className="text-[9.5px] text-slate-500 line-clamp-1 mt-0.5">{day.stay?.description || 'Comfortable stay with secure vehicle parking and hot showers.'}</p>
                                <div className="flex items-center justify-between text-[9.5px] font-bold mt-1.5 pt-1 border-t border-slate-100">
                                  <span className="text-emerald-700">📍 {day.stay?.distanceFromRouteKm || 2.1} km from route (≤ 8 km)</span>
                                  <span className="text-slate-800 font-extrabold">₹{(day.stay?.pricePerNight || 2800).toLocaleString('en-IN')}/nt</span>
                                </div>
                              </div>
                              <a
                                href={day.stay?.directLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((day.stay?.name || trip.destination) + ' hotel ' + trip.destination)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-md bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white text-[10px] font-bold transition-all shadow-xs"
                              >
                                <span>Direct Hotel Link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>

                            {/* Lunch Stop */}
                            <div className="p-2.5 rounded-lg bg-white/95 border border-amber-200 shadow-xs flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between text-[9px] font-black text-amber-800 uppercase tracking-wider mb-1">
                                  <span className="flex items-center gap-1">🍽️ Lunch Pitstop</span>
                                  <span className="text-slate-500 font-medium">{day.lunch?.cuisine || 'Regional'}</span>
                                </div>
                                <h5 className="text-xs font-black text-slate-900 line-clamp-1">{day.lunch?.name || `${trip.destination} Midway Dhaba`}</h5>
                                <p className="text-[9.5px] text-slate-500 line-clamp-1 mt-0.5">{day.lunch?.description || 'Authentic highway lunch feasts, fresh rotis and hot beverages.'}</p>
                                <div className="flex items-center justify-between text-[9.5px] font-bold mt-1.5 pt-1 border-t border-slate-100">
                                  <span className="text-emerald-700">📍 {day.lunch?.distanceFromRouteKm || 0.8} km off route (≤ 8 km)</span>
                                  <span className="text-slate-800 font-extrabold">~₹{day.lunch?.pricePerPerson || 350}/person</span>
                                </div>
                              </div>
                              <a
                                href={day.lunch?.directLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((day.lunch?.name || trip.destination) + ' ' + trip.destination)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-md bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white text-[10px] font-bold transition-all shadow-xs"
                              >
                                <span>Direct Lunch Link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>

                            {/* Dinner Stop */}
                            <div className="p-2.5 rounded-lg bg-white/95 border border-purple-200 shadow-xs flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between text-[9px] font-black text-purple-800 uppercase tracking-wider mb-1">
                                  <span className="flex items-center gap-1">🍷 Dinner Spot</span>
                                  <span className="text-slate-500 font-medium">{day.dinner?.cuisine || 'Tandoor & Local'}</span>
                                </div>
                                <h5 className="text-xs font-black text-slate-900 line-clamp-1">{day.dinner?.name || `${trip.destination} Royal Diner`}</h5>
                                <p className="text-[9.5px] text-slate-500 line-clamp-1 mt-0.5">{day.dinner?.description || 'Evening restaurant with sizzling grills, curries and relaxing atmosphere.'}</p>
                                <div className="flex items-center justify-between text-[9.5px] font-bold mt-1.5 pt-1 border-t border-slate-100">
                                  <span className="text-emerald-700">📍 {day.dinner?.distanceFromRouteKm || 1.5} km off route (≤ 8 km)</span>
                                  <span className="text-slate-800 font-extrabold">~₹{day.dinner?.pricePerPerson || 500}/person</span>
                                </div>
                              </div>
                              <a
                                href={day.dinner?.directLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((day.dinner?.name || trip.destination) + ' ' + trip.destination)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-md bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white text-[10px] font-bold transition-all shadow-xs"
                              >
                                <span>Direct Dinner Link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Day Activities Count Header */}
                      <div className="flex items-center justify-between pt-1 pb-0.5 text-left">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <span>📍 Planned Stops ({day.activities.length} {day.activities.length === 2 ? 'In-Depth Stops ~4h' : day.activities.length >= 4 ? 'Quick Stops 1h-1.5h' : 'Stops ~2h'})</span>
                        </span>
                        <span className="text-[9.5px] font-bold text-teal-600">
                          {day.activities.filter(a => a.hasTicket).length > 0 ? `${day.activities.filter(a => a.hasTicket).length} Ticketed` : 'All Free Entry'}
                        </span>
                      </div>

                      {day.activities.length === 0 ? (
                        <div className="text-center py-4 text-[11px] text-gray-400 italic">
                          No activities planned. Click + to add stops.
                        </div>
                      ) : (
                        day.activities.map((act, index) => (
                          journalMode ? (
                            <div
                              key={act.id}
                              className="group relative flex flex-col gap-3.5 p-4.5 rounded-2xl border-2 border-dashed border-amber-200 bg-[#FFFDF9] hover:shadow-md transition-all text-left"
                            >
                              {/* Scrapbook Tape Deco */}
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-amber-100/75 border border-amber-200/50 rotate-2 shadow-xs pointer-events-none" />
                              
                              <div className="flex items-start justify-between mt-1">
                                <div>
                                  <h4 className="text-xs font-black text-gray-800 font-display flex items-center gap-1">
                                    <span>📍</span> {act.name}
                                  </h4>
                                  {act.time && (
                                    <span className="inline-block px-1.5 py-0.5 text-[8.5px] font-bold bg-amber-100/50 text-amber-800 rounded mt-0.5 uppercase tracking-wide mr-1">
                                      {act.time}
                                    </span>
                                  )}
                                  {act.duration && (
                                    <span className="inline-block px-1.5 py-0.5 text-[8.5px] font-bold bg-blue-100/60 text-blue-900 rounded mt-0.5 mr-1">
                                      ⏱️ {act.duration}
                                    </span>
                                  )}
                                  {act.hasTicket === false || act.ticketCost === 0 ? (
                                    <span className="inline-block px-1.5 py-0.5 text-[8.5px] font-bold bg-emerald-100/60 text-emerald-900 rounded mt-0.5 mr-1">
                                      🎟️ Free
                                    </span>
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.5 text-[8.5px] font-bold bg-amber-100/70 text-amber-900 rounded mt-0.5 mr-1">
                                      🎟️ ₹{act.ticketCost || 150}
                                    </span>
                                  )}
                                  <a
                                    href={act.directLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.name + ' ' + trip.destination)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 text-[8.5px] font-bold text-teal-700 hover:underline mt-0.5"
                                  >
                                    <span>Maps</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(day.dayNumber, act)}
                                    className="p-1 hover:bg-amber-100/50 rounded text-gray-400 hover:text-gray-800"
                                    title="Edit Scrapbook Entry"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteActivity(day.dayNumber, act.id)}
                                    className="p-1 hover:bg-amber-150 rounded text-gray-400 hover:text-pink-650"
                                    title="Delete Scrapbook Entry"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Stop Cover Image */}
                              {act.imageUrl ? (
                                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-150 shadow-inner">
                                  <ImageWithFallback
                                    src={act.imageUrl}
                                    alt={act.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-full py-5 px-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 text-center text-[10px] text-gray-400 italic">
                                  No memory photo attached. Edit stop to add a URL!
                                </div>
                              )}

                              {/* Star Rating Selector (1-5 stars) */}
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Memory Rating</span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => editActivity(day.dayNumber, act.id, { rating: star })}
                                      className={`text-base transition-transform active:scale-125 ${
 star <= (act.rating || 0) ? "text-amber-500 scale-110" : "text-gray-200 hover:text-amber-300"
 }`}
                                    >
                                      ★
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Memory Memo Notes */}
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Travel Memo</span>
                                <textarea
                                  value={act.notes || ""}
                                  onChange={(e) => editActivity(day.dayNumber, act.id, { notes: e.target.value })}
                                  placeholder="Write down your favorite memories, lessons learned, or stories from this stop..."
                                  rows={2}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-amber-100 bg-amber-50/20 text-[10.5px] placeholder-amber-800/40 text-gray-800 focus:outline-none focus:border-amber-300 focus:bg-amber-50/40 leading-normal resize-none"
                                />
                              </div>
                            </div>
                          ) : (
                            <div
                              key={act.id}
                              className="group flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600">
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-gray-800 truncate">{act.name}</h4>
                                  <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    {index > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => moveActivity(day.dayNumber, index, "up")}
                                        className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-800 relative after:absolute after:inset-[-8px] after:content-['']"
                                        title="Move Up"
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                    )}
                                    {index < day.activities.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => moveActivity(day.dayNumber, index, "down")}
                                        className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-800 relative after:absolute after:inset-[-8px] after:content-['']"
                                        title="Move Down"
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(day.dayNumber, act)}
                                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-800 relative after:absolute after:inset-[-8px] after:content-['']"
                                      title="Edit Stop"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteActivity(day.dayNumber, act.id)}
                                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-pink-600 relative after:absolute after:inset-[-8px] after:content-['']"
                                      title="Delete Stop"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {act.imageUrl && (
                                  <div className="relative w-full h-24 rounded-lg overflow-hidden my-2 border border-gray-150 shadow-xs">
                                    <ImageWithFallback
                                      src={act.imageUrl}
                                      alt={act.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}

                                <p className="text-[10px] text-gray-500 mt-1 leading-normal">{act.description}</p>
                                
                                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                  {act.time && (
                                    <span className="inline-block px-1.5 py-0.5 text-[8.5px] font-bold bg-slate-100 text-slate-700 rounded">
                                      {act.time}
                                    </span>
                                  )}
                                  {(act.duration || day.activities.length) && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 rounded">
                                      <Clock className="w-2.5 h-2.5" />
                                      <span>{act.duration || (day.activities.length <= 2 ? "4 hours" : day.activities.length >= 4 ? "1.5 hours" : "2 hours")}</span>
                                    </span>
                                  )}
                                  {act.timeSlot && (
                                    <span className="inline-block px-1.5 py-0.5 text-[8.5px] font-medium bg-slate-50 text-slate-600 border border-slate-200/60 rounded">
                                      🕒 {act.timeSlot}
                                    </span>
                                  )}
                                  {act.hasTicket === false || act.ticketCost === 0 ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded">
                                      <Ticket className="w-2.5 h-2.5" />
                                      <span>Free Entry</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60 rounded">
                                      <Ticket className="w-2.5 h-2.5" />
                                      <span>{act.ticketInfo || `Ticket: ₹${act.ticketCost || 150}/person`}</span>
                                    </span>
                                  )}
                                  <a
                                    href={act.directLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.name + ' ' + trip.destination)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200/60 rounded transition-colors ml-auto shadow-2xs"
                                  >
                                    <span>Direct Location</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          )
                        ))
                      )}
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
            
            {/* Add Day Button */}
            <button
              onClick={() => {
                const themeInput = prompt("Enter a theme/focus for this day (optional):");
                if (themeInput !== null) {
                  addDay(themeInput.trim());
                }
              }}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-teal-500/50 bg-slate-50/50 hover:bg-teal-500/5 transition-all text-xs font-bold text-slate-600 hover:text-teal-700 active:scale-[0.99] shadow-sm mt-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add Day to Itinerary</span>
            </button>
          </div>
        </div>

        {/* COLUMN 2: derived visual layers — each reads the same itinerary JSON */}
        <div className={plannerView === "mindmap" ? "min-h-[680px]" : "h-[400px] lg:h-auto min-h-[400px] lg:max-h-[70vh]"}>
          {plannerView === "mindmap" ? (
            <ItineraryMindMap trip={trip} />
          ) : (
            <Map 
              activities={activeDayActivities} 
              destination={trip.destination} 
              centerCoords={
                activeDayActivities[0]?.lat && activeDayActivities[0]?.lng
                  ? { lat: activeDayActivities[0].lat, lng: activeDayActivities[0].lng }
                  : null
              }
              isGeocoding={isGeocoding}
            />
          )}
        </div>

        {/* COLUMN 3: SIDEBAR UTILITIES TABS */}
        <div id="sidebar-utilities-container" className={plannerView === "mindmap" ? "hidden" : "flex flex-col gap-4 max-h-[70vh]"}>
          {/* Sidebar Tab Header */}
          <div className="flex items-stretch gap-1.5 p-1 rounded-xl bg-gray-50 border border-gray-250 text-xs font-bold w-full">
            <button
              onClick={() => setActiveSidebarTab("places")}
              className={`flex-1 py-1.5 rounded-lg text-center text-[10px] whitespace-nowrap transition-all ${
 activeSidebarTab === "places" ? "bg-white text-teal-600 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-800"
 }`}
            >
              Stops
            </button>
            <button
              onClick={() => setActiveSidebarTab("weather")}
              className={`flex-1 py-1.5 rounded-lg text-center text-[10px] whitespace-nowrap transition-all ${
 activeSidebarTab === "weather" ? "bg-white text-indigo-600 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-800"
 }`}
            >
              Weather
            </button>
            <button
              onClick={() => setActiveSidebarTab("deals")}
              className={`flex-1 py-1.5 rounded-lg text-center text-[10px] whitespace-nowrap transition-all ${
 activeSidebarTab === "deals" ? "bg-white text-indigo-600 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-800"
 }`}
            >
              Deals
            </button>
            <button
              onClick={() => setActiveSidebarTab("assistant")}
              className={`flex-1 py-1.5 rounded-lg text-center text-[10px] whitespace-nowrap transition-all ${
 activeSidebarTab === "assistant" ? "bg-white text-indigo-600 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-800"
 }`}
            >
              AI Help
            </button>
            <button
              onClick={() => setActiveSidebarTab("team")}
              className={`flex-1 py-1.5 rounded-lg text-center text-[10px] whitespace-nowrap transition-all ${
 activeSidebarTab === "team" ? "bg-white text-teal-600 shadow-sm border border-teal-200" : "text-gray-400 hover:text-gray-800"
 } relative`}
            >
              Team
              {(trip?.collaborators?.filter((c: any) => c.status === "pending").length ?? 0) > 0 && (
                <span className="absolute top-0.5 right-1 w-1.5 h-1.5 bg-teal-500 rounded-full" />
              )}
            </button>
          </div>

          {/* TAB 1: PLACES */}
          {activeSidebarTab === "places" && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm text-left">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-teal-600" />
                  Routing Stops Coordinates
                </h3>
                <div className="space-y-2 text-[10px]">
                  {activeDayActivities.map((act, idx) => (
                    <div key={act.id} className="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-100">
                      <span className="font-semibold text-gray-700 truncate w-1/2">{idx + 1}. {act.name}</span>
                      <span className="font-mono text-gray-500">
                        {act.lat && act.lng 
                          ? `${act.lat.toFixed(4)}, ${act.lng.toFixed(4)}` 
                          : "Resolving GPS..."}
                      </span>
                    </div>
                  ))}
                  {activeDayActivities.length === 0 && (
                    <div className="text-center py-2 text-gray-400 italic">No stops plotted for Day {activeDay}.</div>
                  )}
                </div>
              </div>

              <div
                onClick={() => router.push(`/budget/${trip.id}`)}
                className="p-4 rounded-xl border border-teal-500/10 bg-teal-500/5 hover:bg-teal-500/10 transition-colors cursor-pointer text-left shadow-sm"
              >
                <h4 className="text-xs font-bold text-teal-600 flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-teal-600" /> Smart Budget Ledger
                </h4>
                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                  View expense allocations, budget alerts, and unlock the SVG category breakdown donuts.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: CO-TRAVELERS / TEAM */}
          {activeSidebarTab === "team" && (() => {
            const isOwner = user && trip && trip.userId === user.id;
            const collaborators: any[] = trip?.collaborators || [];

            const handleInvite = async (e: React.FormEvent) => {
              e.preventDefault();
              if (!coTravelerEmail.trim()) return;
              setIsInviting(true);
              setInviteMessage(null);
              try {
                const res = await fetch(`/api/trips/${tripId}/collaborators`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: coTravelerEmail.trim() }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to send invitation");
                setInviteMessage({ type: "success", text: `Invitation sent to ${coTravelerEmail.trim()}!` });
                setCoTravelerEmail("");
                syncState();
              } catch (err: any) {
                setInviteMessage({ type: "error", text: err.message || "Failed to send invitation" });
              } finally {
                setIsInviting(false);
              }
            };

            const handleRemove = async (email: string) => {
              if (!confirm(`Remove ${email} from this trip?`)) return;
              setRemovingEmail(email);
              try {
                const res = await fetch(`/api/trips/${tripId}/collaborators`, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                });
                if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data.error || "Failed to remove co-traveler");
                }
                syncState();
              } catch (err: any) {
                alert(err.message);
              } finally {
                setRemovingEmail(null);
              }
            };

            return (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-left">
                {/* Team Header */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    Co-Travelers
                  </h3>
                  <p className="text-[9px] text-gray-400 mb-3">
                    {isOwner
                      ? "Invite people by email. They will see this trip in their dashboard after accepting."
                      : "People sharing this trip."}
                  </p>

                  {/* Collaborator list */}
                  <div className="space-y-2 mb-3">
                    {collaborators.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic text-center py-2">No co-travelers yet.</p>
                    ) : (
                      collaborators.map((collab: any, idx: number) => (
                        <div key={collab.email || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black ${
                              collab.status === "accepted" ? "bg-teal-600" :
                              collab.status === "declined" ? "bg-gray-400" : "bg-amber-500"
                            }`}>
                              {(collab.name || collab.email || "?")[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-gray-800 truncate">{collab.name || collab.email}</p>
                              {collab.name && <p className="text-[9px] text-gray-400 truncate">{collab.email}</p>}
                              <span className={`inline-block text-[8px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-full mt-0.5 ${
                                collab.status === "accepted" ? "bg-teal-100 text-teal-700" :
                                collab.status === "declined" ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"
                              }`}>
                                {collab.status === "accepted" ? "✓ Joined" : collab.status === "declined" ? "✗ Declined" : "⏳ Pending"}
                              </span>
                            </div>
                          </div>
                          {isOwner && (
                            <button
                              type="button"
                              disabled={removingEmail === collab.email}
                              onClick={() => handleRemove(collab.email)}
                              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
                              title="Remove co-traveler"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Invite form — only for owner */}
                  {isOwner && (
                    <form onSubmit={handleInvite} className="flex flex-col gap-2">
                      <div className="flex gap-1.5">
                        <div className="relative flex-1">
                          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                          <input
                            type="email"
                            value={coTravelerEmail}
                            onChange={(e) => setCoTravelerEmail(e.target.value)}
                            placeholder="friend@email.com"
                            className="w-full glass-input pl-7 pr-2 py-1.5 rounded-lg text-[10px] focus:outline-none"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isInviting || !coTravelerEmail.trim()}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-[10px] font-bold flex items-center gap-1 transition-colors flex-shrink-0"
                        >
                          {isInviting ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <UserPlus className="w-3 h-3" />
                          )}
                          <span>Invite</span>
                        </button>
                      </div>
                      {inviteMessage && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`text-[9px] font-bold px-2 py-1 rounded-lg ${
                            inviteMessage.type === "success"
                              ? "bg-teal-50 text-teal-700 border border-teal-200"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}
                        >
                          {inviteMessage.type === "success" ? "✓" : "✗"} {inviteMessage.text}
                        </motion.p>
                      )}
                    </form>
                  )}
                </div>

                {/* Trip owner info */}
                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 text-left">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Trip Owner</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                      {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "O"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-800 truncate">{user?.name || "Trip Creator"}</p>
                      {isOwner && <p className="text-[9px] text-teal-600 font-semibold">You (owner)</p>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 2: WEATHER */}
          {activeSidebarTab === "weather" && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm text-left">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <CloudSun className="w-4 h-4 text-pink-500" />
                  7-Day Forecast Grid
                </h3>

                {loadingWeather ? (
                  <div className="text-center py-4 text-xs text-gray-400 animate-pulse">Fetching forecasts...</div>
                ) : weatherForecast?.forecast?.daily ? (
                  <div className="grid grid-cols-4 gap-2">
                    {weatherForecast.forecast.daily.time.slice(0, 4).map((timeStr: string, idx: number) => {
                      const maxTemp = weatherForecast.forecast.daily.temperature_2m_max[idx];
                      const minTemp = weatherForecast.forecast.daily.temperature_2m_min[idx];
                      const prob = weatherForecast.forecast.daily.precipitation_probability_max[idx];
                      
                      return (
                        <div key={idx} className="p-2 rounded bg-gray-50 text-center border border-gray-200">
                          <span className="text-[8px] text-gray-400 block uppercase font-bold">
                            {new Date(timeStr).toLocaleDateString("en-US", { weekday: "short" })}
                          </span>
                          <span className="text-xs font-bold text-gray-800 block mt-1">{Math.round(maxTemp)}°</span>
                          <span className="text-[9px] text-gray-500 block">{Math.round(minTemp)}°</span>
                          {prob > 20 && (
                            <span className="text-[8px] text-teal-600 block mt-0.5">🌧 {prob}%</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-[10px] text-gray-400">Weather data unavailable offline.</div>
                )}

                {weatherAdvice && (
                  <div className="mt-4 p-3 rounded-lg bg-pink-500/5 border border-pink-500/10 text-[10px] text-gray-600 leading-relaxed">
                    💡 <strong>AI Weather Advice:</strong> {weatherAdvice.best_visiting_hours} Wear {weatherAdvice.clothing_recommendations.toLowerCase()}
                  </div>
                )}
              </div>

              {/* Interactive Packing Checklist */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm text-left">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-teal-600" />
                  Interactive Packing Checklist
                </h3>
                
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {trip.packingList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => togglePackingItem(item.id)}
                      className="flex items-center justify-between p-2 rounded bg-gray-50 hover:bg-gray-100 border border-gray-150 cursor-pointer text-[10px]"
                    >
                      <div className="flex items-center gap-2 w-4/5">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          readOnly
                          className="w-3.5 h-3.5 rounded accent-teal-600 flex-shrink-0 cursor-pointer"
                        />
                        <span className={`truncate ${item.checked ? "line-through text-gray-400" : "text-gray-700"}`}>
                          {item.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePackingItem(item.id);
                        }}
                        className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-pink-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newPackingText.trim()) return;
                    addPackingItem("Personal", newPackingText.trim());
                    setNewPackingText("");
                  }}
                  className="flex gap-1.5 mt-3"
                >
                  <input
                    type="text"
                    value={newPackingText}
                    onChange={(e) => setNewPackingText(e.target.value)}
                    placeholder="Add item..."
                    className="flex-1 glass-input px-3 py-1.5 rounded-lg text-[10px] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 rounded-lg bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center hover:bg-teal-500 transition-colors"
                  >
                    Add
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 3: DEALS */}
          {activeSidebarTab === "deals" && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-left">
              {/* 1. Road Trip & 8 KM Highway Radar (when mode is bike or car) */}
              {(trip.transportMode === "bike" || trip.transportMode === "car") && (
                <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 shadow-sm text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 mb-2 border-b border-teal-500/15">
                    <div>
                      <h3 className="text-xs font-black text-teal-800 uppercase tracking-wide flex items-center gap-1.5">
                        {trip.transportMode === "bike" ? <Bike className="w-4 h-4 text-teal-600" /> : <Car className="w-4 h-4 text-indigo-600" />}
                        {trip.transportMode === "bike" ? "🏍️ Bike Road Route & Pitstops" : "🚗 Road Trip Pitstop Radar"}
                      </h3>
                      <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                        {roadRoute?.distanceKm || trip.routeDistanceKm || 585} KM • {roadRoute?.durationText || (trip.transportMode === "bike" ? "~11h ride" : "~9h drive")} • Est. Fuel: ~₹{roadRoute?.fuelEstimatedCost?.toLocaleString() || "1,920"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-teal-500/20 shadow-xs self-start sm:self-auto">
                      <Radar className="w-3.5 h-3.5 text-teal-600 animate-spin" style={{ animationDuration: "6s" }} />
                      <span className="text-[8.5px] font-black text-teal-800 uppercase">8 km Corridor Radar</span>
                    </div>
                  </div>

                  <p className="text-[9.5px] text-slate-600 font-medium mb-2.5">
                    Curated <strong>Hotels, Lunch & Dinner dhabas strictly within 8 km</strong> of your highway route:
                  </p>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {[
                      { id: "all", label: `All Pitstops (${roadRoute?.allPitstops?.length || trip.pitstops?.length || 6})` },
                      { id: "lunch", label: `🍲 Lunch (${roadRoute?.lunchStops?.length || 2})` },
                      { id: "dinner", label: `🍽️ Dinner (${roadRoute?.dinnerStops?.length || 2})` },
                      { id: "hotel", label: `🏨 Hotels (${roadRoute?.hotelsAlongRoute?.length || 2})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPitstopFilter(tab.id as any)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold transition-all cursor-pointer ${
                          pitstopFilter === tab.id
                            ? "bg-teal-600 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-gray-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Pitstop Cards */}
                  <div className="space-y-2.5">
                    {(() => {
                      const list = pitstopFilter === "lunch"
                        ? roadRoute?.lunchStops || []
                        : pitstopFilter === "dinner"
                        ? roadRoute?.dinnerStops || []
                        : pitstopFilter === "hotel"
                        ? roadRoute?.hotelsAlongRoute || []
                        : roadRoute?.allPitstops || (trip.pitstops as any[]) || [];

                      if (list.length === 0) {
                        return (
                          <div className="text-center py-4 text-[10px] text-gray-400 italic">
                            Scanning 8 km highway radar along the route...
                          </div>
                        );
                      }

                      return list.map((stop: any, idx: number) => (
                        <div key={stop.id || idx} className="p-3 rounded-xl bg-white border border-gray-200 shadow-xs flex flex-col justify-between text-left hover:border-teal-500/40 transition-colors">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                              stop.type === "lunch" ? "bg-amber-100 text-amber-800" : stop.type === "dinner" ? "bg-indigo-100 text-indigo-800" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {stop.type === "lunch" ? "🍲 LUNCH STOP" : stop.type === "dinner" ? "🍽️ DINNER STOP" : "🏨 NIGHT HOTEL"} • Km {stop.atKm}
                            </span>
                            <span className="text-[8px] font-extrabold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                              📍 {stop.distanceFromRouteKm} km off NH (≤ 8 km)
                            </span>
                          </div>

                          <h5 className="text-xs font-black text-slate-800 truncate">{stop.name}</h5>
                          <p className="text-[10px] text-slate-600 line-clamp-2 mt-0.5">{stop.description}</p>

                          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-900">
                              {stop.pricePerPerson ? `₹${stop.pricePerPerson}/person` : stop.pricePerNight ? `₹${stop.pricePerNight}/night` : "Budget friendly"} • ⭐ {stop.rating || 4.5}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  addActivity(1, stop.name, stop.description, stop.type === "lunch" ? "Afternoon" : stop.type === "dinner" ? "Evening" : "Morning", stop.lat, stop.lng);
                                  alert(`Added ${stop.name} to Day 1 Itinerary!`);
                                }}
                                className="text-[8px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 rounded hover:bg-teal-100 transition-colors cursor-pointer"
                              >
                                + Itinerary
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const cost = (stop.pricePerPerson || stop.pricePerNight || 350) * trip.travelers;
                                  addExpense(`${stop.type === 'lunch' ? 'Lunch' : stop.type === 'dinner' ? 'Dinner' : 'Hotel'}: ${stop.name}`, stop.type === 'hotel' ? 'Hotels' : 'Food', cost);
                                  alert(`Allocated ₹${cost.toLocaleString()} for ${stop.name} to Budget Ledger.`);
                                }}
                                className="text-[8px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-100 transition-colors cursor-pointer"
                              >
                                + Budget
                              </button>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* 2. Train Transit Options (when mode is train) */}
              {trip.transportMode === "train" && (
                <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Train className="w-4 h-4 text-emerald-600" />
                    Train & Rail Transit Options
                  </h3>
                  <div className="space-y-2.5">
                    {(trainDeals.length > 0 ? trainDeals : [
                      { departure: "06:00 AM", arrival: "02:30 PM", duration: "8h 30m", price: 1250, label: "Sleeper Express", train: "Vande Bharat Express" },
                      { departure: "02:15 PM", arrival: "11:00 PM", duration: "8h 45m", price: 2400, label: "3rd A/C Superfast", train: "Tejas Rajdhani Express" },
                    ]).map((t: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/20 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-emerald-800">{t.train || t.label || "Superfast Express"}</span>
                          <span className="text-[9px] text-slate-500 block">{t.departure} ➔ {t.arrival} • {t.duration}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 block">₹{t.price}</span>
                          <button
                            type="button"
                            onClick={() => {
                              addExpense(`Train: ${t.train || t.label}`, "Flights", t.price * trip.travelers);
                              alert(`Added Train ticket expense ₹${(t.price * trip.travelers).toLocaleString()} to budget.`);
                            }}
                            className="text-[8px] font-extrabold text-teal-700 underline cursor-pointer"
                          >
                            Select Train
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Flight Carrier Comparison Decks (when mode is flight or default) */}
              {(trip.transportMode === "flight" || (!trip.transportMode && flightDeals.length > 0)) && (
                <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-teal-600" />
                    Flight Carrier Comparison
                  </h3>
                  {loadingDeals ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 animate-pulse h-28 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="h-3 bg-gray-200 rounded w-2/3" />
                          <div className="h-2 bg-gray-200 rounded w-1/2" />
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                      </div>
                      <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 animate-pulse h-28 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="h-3 bg-gray-200 rounded w-2/3" />
                          <div className="h-2 bg-gray-200 rounded w-1/2" />
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {flightDeals.length > 0 ? (
                        flightDeals.slice(0, 2).map((f: any, idx: number) => {
                          const carrierName = f.flights?.[0]?.airline || "Air Carrier";
                          const hrs = Math.floor(f.total_duration / 60);
                          const mins = f.total_duration % 60;
                          const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                          const stopsStr = f.flights?.length > 1 ? `${f.flights.length - 1} Stop` : "Direct";
                          const colors = [
                            "border-red-200 bg-red-500/5 text-red-700",
                            "border-blue-200 bg-blue-500/5 text-blue-700"
                          ][idx % 2];
                          
                          return (
                            <div key={idx} className={`p-3 rounded-xl border ${colors} flex flex-col justify-between h-28 text-left`}>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider block truncate">{carrierName}</span>
                                <span className="text-[9px] opacity-75 mt-0.5 block">{timeStr} • {stopsStr}</span>
                              </div>
                              <div className="mt-auto">
                                <span className="text-xs font-black block">₹{f.price.toLocaleString("en-IN")}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    addExpense(`Flight: ${carrierName}`, "Flights", f.price * trip.travelers);
                                    alert(`Added ${carrierName} flight expense allocation of Rs ${(f.price * trip.travelers).toLocaleString()} to Budget Ledger.`);
                                  }}
                                  className="mt-1 text-[8px] font-extrabold underline cursor-pointer hover:opacity-85"
                                >
                                  Select Carrier
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-2 py-6 text-center text-[10px] text-gray-400 italic border border-dashed border-gray-150 rounded-xl w-full">
                          No flight deals found for this route.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Hotel Rate Comparison Decks */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Hotel className="w-4 h-4 text-pink-600" />
                  Hotel Rate Comparison
                </h3>
                {loadingDeals ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 animate-pulse h-28 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="h-3 bg-gray-200 rounded w-2/3" />
                        <div className="h-2 bg-gray-200 rounded w-1/2" />
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 animate-pulse h-28 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="h-3 bg-gray-200 rounded w-2/3" />
                        <div className="h-2 bg-gray-200 rounded w-1/2" />
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {hotelDeals.length > 0 ? (
                      hotelDeals.slice(0, 2).map((h: any, idx: number) => {
                        const hotelName = h.name || "Boutique Hotel";
                        const ratingVal = h.overall_rating ? `${h.overall_rating} ★` : "4.5 ★";
                        const priceNum = parseInt(h.rate_per_night?.lowest?.replace(/[^0-9]/g, "")) || 4500;
                        const colors = [
                          "border-emerald-200 bg-emerald-500/5 text-emerald-700",
                          "border-amber-200 bg-amber-500/5 text-amber-700"
                        ][idx % 2];
                        
                        return (
                          <div key={idx} className={`p-3 rounded-xl border ${colors} flex flex-col justify-between h-28 text-left`}>
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider block truncate">{hotelName}</span>
                              <span className="text-[9px] opacity-75 mt-0.5 block">{ratingVal} • Hotel Stay</span>
                            </div>
                            <div className="mt-auto">
                              <span className="text-xs font-black block">₹{priceNum.toLocaleString("en-IN")}/n</span>
                              <button
                                type="button"
                                onClick={() => {
                                  addExpense(`Hotel: ${hotelName}`, "Hotels", priceNum * trip.days);
                                  alert(`Added ${hotelName} stay expense allocation of Rs ${(priceNum * trip.days).toLocaleString()} to Budget Ledger.`);
                                }}
                                className="mt-1 text-[8px] font-extrabold underline cursor-pointer hover:opacity-85"
                              >
                                Select Hotel
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-2 py-6 text-center text-[10px] text-gray-400 italic border border-dashed border-gray-150 rounded-xl w-full">
                        No hotel rates found for this destination.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* API Backup Hotel booking cards */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Hotel className="w-4 h-4 text-indigo-650" />
                    Boutique Hotel Deals
                  </h3>
                  <button
                    onClick={() => setDealSorting(dealSorting === "price" ? "rating" : "price")}
                    className="flex items-center gap-0.5 text-[9px] text-gray-400 hover:text-teal-600 font-bold"
                  >
                    <ArrowUpDown className="w-3 h-3" /> Sort: {dealSorting}
                  </button>
                </div>

                {loadingDeals ? (
                  <div className="text-center py-4 text-xs text-gray-400 animate-pulse">Checking local rates...</div>
                ) : (
                  <div className="space-y-3">
                    {[...hotelDeals]
                      .sort((a, b) => {
                        if (dealSorting === "price") {
                          const ap = parseInt(a.rate_per_night?.lowest?.replace(/[^0-9]/g, "")) || 0;
                          const bp = parseInt(b.rate_per_night?.lowest?.replace(/[^0-9]/g, "")) || 0;
                          return ap - bp;
                        } else {
                          return (b.overall_rating || 0) - (a.overall_rating || 0);
                        }
                      })
                      .slice(0, 2)
                      .map((hotel, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-gray-150 bg-gray-50 flex items-center gap-3">
                          <ImageWithFallback
                            src={hotel.images?.[0]?.thumbnail || ""}
                            alt={hotel.name}
                            width={48}
                            height={48}
                            fallbackText={hotel.name}
                            containerClassName="w-12 h-12 rounded-lg border border-gray-200"
                            className="w-full h-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-bold text-gray-800 truncate">{hotel.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-gray-500">⭐ {hotel.overall_rating || "4.5"}</span>
                              <span className="text-[10px] font-extrabold text-pink-650">{hotel.rate_per_night?.lowest || "₹3,500"}</span>
                            </div>
                            <button
                              onClick={() => handleAddHotelExpense(hotel)}
                              className="mt-1.5 text-[8px] font-extrabold text-teal-600 hover:text-teal-500 flex items-center gap-0.5"
                            >
                              <PlusCircle className="w-2.5 h-2.5" /> Allocate Stay to budget
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AI COMPANION */}
          {activeSidebarTab === "assistant" && (
            <div className="flex-1 flex flex-col min-h-0">
              <AIChatAssistant 
                destination={trip.destination} 
                startDate={trip.startDate} 
                travelers={trip.travelers} 
              />
            </div>
          )}
          {/* COLLAPSIBLE TRIP CHAT */}
          <div className="mt-auto border border-gray-200 rounded-2xl bg-white shadow-sm flex flex-col overflow-hidden">
            <div 
              onClick={() => setIsChatExpanded(!isChatExpanded)}
              className="px-4 py-3 bg-gray-50 border-b border-gray-150 flex justify-between items-center cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-teal-600" /> Trip Chat
                </span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              </div>
              {isChatExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </div>
            
            {isChatExpanded && (
              <div className="flex flex-col h-60 bg-white">
                {/* Message Log */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs text-left scrollbar-thin">
                  {chatMessages.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${msg.sender === "Kunth" ? "items-end" : "items-start"}`}>
                      <span className="text-[9px] text-gray-400 font-bold mb-0.5">{msg.sender}</span>
                      <div className={`px-3 py-1.5 rounded-2xl max-w-[85%] ${
 msg.sender === "Kunth" 
 ? "bg-teal-600 text-white rounded-tr-none" 
 : "bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200"
 }`}>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Chat Input */}
                <form onSubmit={handleSendChatMessage} className="p-2 border-t border-gray-150 flex gap-1.5 bg-gray-50">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 glass-input px-3 py-1.5 rounded-xl text-[11px] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-extrabold flex items-center justify-center transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* --- ADD STOP MODAL --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-gray-950/20 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-2xl glass-panel border-gray-200 bg-white p-6 shadow-xl flex flex-col gap-4 text-left"
            >
              <div>
                <h3 className="text-base font-bold font-display text-gray-900">Add Stop for Day {targetDay}</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Enter a landmark or cafe name. Coordinates will auto-resolve.</p>
              </div>

              <form onSubmit={handleSaveAddStop} className="space-y-3.5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Place Name</label>
                    <button
                      type="button"
                      disabled={isSuggestingStops}
                      onClick={fetchAiStopSuggestions}
                      className="px-2.5 py-1 rounded-lg text-[9px] font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                    >
                      {isSuggestingStops ? (
                        <>
                          <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-2.5 h-2.5 text-teal-150 animate-pulse" />
                          <span>Suggest with AI</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={stopName}
                    onChange={(e) => setStopName(e.target.value)}
                    placeholder="Gateway of India, Starbucks..."
                    required
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs placeholder-gray-400 focus:outline-none"
                  />
                  
                  {suggestError && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1">
                      ⚠️ {suggestError}
                    </p>
                  )}

                  {aiStopSuggestions.length > 0 && (
                    <div className="space-y-1.5 mt-2 bg-teal-500/5 p-2 rounded-xl border border-teal-500/10 text-left">
                      <span className="text-[9px] font-bold text-teal-750 uppercase tracking-wider block">AI Suggested Stops:</span>
                      <div className="flex flex-wrap gap-1">
                        {aiStopSuggestions.map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setStopName(sug.name);
                              setStopDesc(sug.description);
                              setStopTime(sug.time || "Morning");
                            }}
                            className="px-2 py-1 rounded-lg border border-teal-500/20 bg-white hover:bg-teal-50/50 text-[9px] text-teal-700 font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                          >
                            📍 {sug.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Schedule Block</label>
                  <select
                    value={stopTime}
                    onChange={(e) => setStopTime(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs cursor-pointer focus:outline-none"
                  >
                    <option value="Morning" className="bg-white text-gray-900">Morning (9am - 12pm)</option>
                    <option value="Afternoon" className="bg-white text-gray-900">Afternoon (2pm - 5pm)</option>
                    <option value="Evening" className="bg-white text-gray-900">Evening (7pm - 10pm)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Description</label>
                  <textarea
                    value={stopDesc}
                    onChange={(e) => setStopDesc(e.target.value)}
                    placeholder="Activities to do..."
                    rows={3}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs placeholder-gray-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Memory Photo Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={stopImageUrl}
                      onChange={(e) => setStopImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="flex-grow glass-input px-3.5 py-2 rounded-xl text-xs placeholder-gray-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchImages(stopName)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      disabled={isSearchingImages}
                    >
                      {isSearchingImages ? "Searching..." : "🔍 Search Gallery"}
                    </button>
                  </div>
                  {imageSearchResults.length > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-xl border border-gray-150 bg-gray-50/50 max-h-36 overflow-y-auto">
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                        <span>Select a photo:</span>
                        <button type="button" onClick={() => setImageSearchResults([])} className="text-pink-650 hover:underline">Clear</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {imageSearchResults.map((img, i) => (
                          <div 
                            key={i} 
                            onClick={() => {
                              setStopImageUrl(img.original);
                              setImageSearchResults([]);
                            }}
                            className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 hover:border-teal-500 cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
                            title={img.title}
                          >
                            <img src={img.thumbnail} alt={img.title} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-50 text-gray-400 relative after:absolute after:inset-[-6px] after:rounded-xl after:content-['']"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-500 transition-colors relative after:absolute after:inset-[-6px] after:rounded-xl after:content-['']"
                  >
                    Add Stop
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT STOP MODAL --- */}
      <AnimatePresence>
        {showEditModal && selectedActivity && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-gray-950/20 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-2xl glass-panel border-gray-200 bg-white p-6 shadow-xl flex flex-col gap-4 text-left"
            >
              <div>
                <h3 className="text-base font-bold font-display text-gray-900">Edit Stop</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Edit stop detail. Adjusting title trigger coordinates update.</p>
              </div>

              <form onSubmit={handleSaveEditStop} className="space-y-3.5">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Place Name</label>
                  <input
                    type="text"
                    value={stopName}
                    onChange={(e) => setStopName(e.target.value)}
                    required
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Schedule Block</label>
                  <select
                    value={stopTime}
                    onChange={(e) => setStopTime(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs cursor-pointer focus:outline-none"
                  >
                    <option value="Morning" className="bg-white text-gray-900">Morning (9am - 12pm)</option>
                    <option value="Afternoon" className="bg-white text-gray-900">Afternoon (2pm - 5pm)</option>
                    <option value="Evening" className="bg-white text-gray-900">Evening (7pm - 10pm)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Description</label>
                  <textarea
                    value={stopDesc}
                    onChange={(e) => setStopDesc(e.target.value)}
                    rows={3}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Memory Photo Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={stopImageUrl}
                      onChange={(e) => setStopImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="flex-grow glass-input px-3.5 py-2 rounded-xl text-xs placeholder-gray-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchImages(stopName)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      disabled={isSearchingImages}
                    >
                      {isSearchingImages ? "Searching..." : "🔍 Search Gallery"}
                    </button>
                  </div>
                  {imageSearchResults.length > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-xl border border-gray-150 bg-gray-50/50 max-h-36 overflow-y-auto">
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                        <span>Select a photo:</span>
                        <button type="button" onClick={() => setImageSearchResults([])} className="text-pink-650 hover:underline">Clear</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {imageSearchResults.map((img, i) => (
                          <div 
                            key={i} 
                            onClick={() => {
                              setStopImageUrl(img.original);
                              setImageSearchResults([]);
                            }}
                            className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 hover:border-teal-500 cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
                            title={img.title}
                          >
                            <img src={img.thumbnail} alt={img.title} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-50 text-gray-400 relative after:absolute after:inset-[-6px] after:rounded-xl after:content-['']"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-500 transition-colors relative after:absolute after:inset-[-6px] after:rounded-xl after:content-['']"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating AI Assistant Trigger Button */}
      <div className="fixed bottom-6 right-6 z-[99]">
        <button
          type="button"
          onClick={handleFocusAIAssistant}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-teal-600 to-teal-400 hover:from-teal-700 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
          <span>Ask TripMitra AI</span>
        </button>
      </div>

    </div>
  );
}
