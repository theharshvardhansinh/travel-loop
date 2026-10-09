"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { 
  Search, History, Trash2, Calendar, Users, 
  Globe, Star, Compass, ArrowRight, Sparkles, Navigation, 
  CloudSun, Landmark, Heart, Smile, Brain, Plane, Hotel, Coins,
  UserPlus, Check, X
} from "lucide-react";
import { 
  getMongoTrips, createMongoTrip, deleteMongoTrip,
  getMongoInvitations, respondToInvitation,
  getSearchHistory, saveSearchQuery, Trip
} from "@/lib/store";
import ImageWithFallback from "@/components/ImageWithFallback";
import ScrollReveal from "@/components/ScrollReveal";

const getFlagEmoji = (dest: string) => {
  const d = dest.toLowerCase();
  if (d.includes("japan") || d.includes("kyoto") || d.includes("tokyo")) return "🇯🇵";
  if (d.includes("india") || d.includes("goa") || d.includes("manali") || d.includes("varanasi") || d.includes("delhi") || d.includes("mumbai")) return "🇮🇳";
  if (d.includes("france") || d.includes("paris")) return "🇫🇷";
  if (d.includes("italy") || d.includes("rome")) return "🇮🇹";
  if (d.includes("indonesia") || d.includes("bali")) return "🇮🇩";
  if (d.includes("croatia") || d.includes("dubrovnik")) return "🇭🇷";
  if (d.includes("maldives")) return "🇲🇻";
  if (d.includes("thailand") || d.includes("phuket")) return "🇹🇭";
  return "🌍";
};

export default function HomePage() {
  const router = useRouter();
  
  // Parallax hook
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, 80]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.3]);

  // Form State
  const [destination, setDestination] = useState("");
  const [originCity, setOriginCity] = useState("Mumbai");
  const [dates, setDates] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelers, setTravelers] = useState(1);
  const [budgetLimit, setBudgetLimit] = useState(50000);

  // UI States
  const [history, setHistory] = useState<string[]>([]);
  const [savedTrips, setSavedTrips] = useState<Trip[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load the most recent trip for the preview card
  const latestTrip = savedTrips.length > 0 ? savedTrips[0] : null;

  // Values for preview card
  const previewDest = latestTrip ? latestTrip.destination : "Tokyo Adventure";
  const previewDays = latestTrip ? latestTrip.days : 7;
  const previewOrigin = latestTrip ? (latestTrip.originCity || "Mumbai") : "Delhi";
  const previewFlag = getFlagEmoji(previewDest);

  // Stop 1 & Stop 2 for the route
  const firstDay = latestTrip?.itinerary?.[0];
  
  const getFallbackStops = (dest: string): { s1: string; s2: string } => {
    const cleanDest = dest.split(',')[0].trim().toLowerCase();
    switch (cleanDest) {
      case "jaipur":
        return { s1: "Jaipur City", s2: "Amer Fort" };
      case "tokyo":
        return { s1: "Shibuya", s2: "Asakusa" };
      case "goa":
        return { s1: "Panaji", s2: "Calangute" };
      case "manali":
        return { s1: "Mall Road", s2: "Solang Valley" };
      case "mumbai":
        return { s1: "Colaba", s2: "Gateway" };
      case "delhi":
        return { s1: "Connaught Pl", s2: "Red Fort" };
      case "gwalior":
        return { s1: "Jai Vilas Pal", s2: "Gwalior Fort" };
      default:
        const formatted = dest.split(',')[0].trim();
        return { s1: `${formatted} City`, s2: `${formatted} Tour` };
    }
  };

  const fallbacks = getFallbackStops(previewDest);
  const stop1 = firstDay?.activities?.[0]?.name 
    ? (firstDay.activities[0].name.length > 15 ? firstDay.activities[0].name.substring(0, 15) + "..." : firstDay.activities[0].name) 
    : fallbacks.s1;
  const stop2 = firstDay?.activities?.[firstDay.activities.length - 1]?.name 
    ? (firstDay.activities[firstDay.activities.length - 1].name.length > 15 ? firstDay.activities[firstDay.activities.length - 1].name.substring(0, 15) + "..." : firstDay.activities[firstDay.activities.length - 1].name) 
    : fallbacks.s2;

  // Dynamic values for budget tracking
  const totalBudget = latestTrip ? latestTrip.budgetLimit : 120000;
  const totalSpent = latestTrip && Array.isArray(latestTrip.expenses)
    ? latestTrip.expenses.reduce((sum: number, exp: any) => sum + (parseFloat(exp.amount) || 0), 0)
    : 72000;
  const spentPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  // Dynamic flights price/carrier
  const flightPrice = latestTrip ? Math.round(4500 + (totalBudget * 0.12)) : 42500;
  const hotelPrice = latestTrip ? Math.round(1500 + (totalBudget * 0.08)) : 18200;

  const handlePreviewClick = () => {
    if (latestTrip) {
      router.push(`/planner/${latestTrip.id}`);
    }
  };

  // Rotating placeholder suggestions
  const placeholderSuggestions = [
    "Kyoto under ₹90K",
    "Goa with friends this weekend",
    "Bali honeymoon for 6 days",
    "Europe backpacking trip"
  ];
  const [currentPlaceholderIdx, setCurrentPlaceholderIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholderIdx((prev) => (prev + 1) % placeholderSuggestions.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [placeholderSuggestions.length]);

  const [invitations, setInvitations] = useState<Trip[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const loadTripsAndInvitations = async () => {
    try {
      const [trips, invites] = await Promise.all([
        getMongoTrips(),
        getMongoInvitations(),
      ]);
      setSavedTrips(trips);
      setInvitations(invites);
    } catch (error) {
      console.error("Could not load MongoDB trips:", error);
    }
  };

  // MongoDB is the source of truth for authenticated users.
  useEffect(() => {
    setHistory(getSearchHistory());
    loadTripsAndInvitations();
  }, []);

  const handleRespondInvitation = async (tripId: string, action: "accept" | "decline", e: React.MouseEvent) => {
    e.stopPropagation();
    setRespondingId(tripId);
    try {
      await respondToInvitation(tripId, action);
      await loadTripsAndInvitations();
    } catch (error: any) {
      alert(error.message || "Failed to respond to invitation");
    } finally {
      setRespondingId(null);
    }
  };

  // Voice Search Handler
  const handleVoiceSearch = () => {
    if (typeof window === "undefined") return;
    
    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please try Chrome or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const cleanTranscript = transcript.replace(/[.?!]/g, "");
      setDestination(cleanTranscript);
    };

    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  // Submit Handler (Saves trip to MongoDB)
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;

    setGenerating(true);
    saveSearchQuery(destination);
    setHistory(getSearchHistory());

    // Geocoding check (log warning if unresolved but do not block search)
    try {
      const geoUrl = `/api/geocode?place=${encodeURIComponent(destination.trim())}`;
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) {
        console.warn(`Could not resolve coordinates for "${destination}". Continuing to generate itinerary.`);
      }
    } catch (err) {
      console.warn("Geocoding validation check failed, continuing anyway:", err);
    }

    const calculatedDays = (() => {
      if (dates && endDate) {
        const start = new Date(dates);
        const end = new Date(endDate);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
        return Math.max(1, Math.min(30, diffDays));
      }
      return 3;
    })();

    const tripParams = {
      destination,
      originCity: originCity || "Mumbai",
      startDate: dates || new Date().toISOString().split("T")[0],
      days: calculatedDays,
      travelers,
      budgetLimit,
    };

    try {
      const response = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: tripParams.destination,
          originCity: tripParams.originCity,
          travelers: tripParams.travelers,
          days: tripParams.days,
          budgetLimit: tripParams.budgetLimit,
        }),
      });

      if (!response.ok) throw new Error("Generation failed");
      const data = await response.json();
      
      let newTrip;
      newTrip = await createMongoTrip({
          destination: tripParams.destination,
          originCity: tripParams.originCity,
          startDate: tripParams.startDate,
          days: data.generatedDays || 3,
          travelers: tripParams.travelers,
          budgetLimit: tripParams.budgetLimit,
          itinerary: data.days || [],
        });

      if (newTrip) router.push(`/planner/${newTrip.id}`);
    } catch (err) {
      console.error("Itinerary generation error, fallback triggering:", err);
      // Local Mock Fallback
      let newTrip;
      const fallbackItinerary = [
        {
          dayNumber: 1,
          theme: "Arrival & City Explorer",
          activities: [
            { id: "1", name: `${destination} City Gateway`, description: "Scenic landmark visit and orientation walk.", time: "Morning" }
          ]
        }
      ];

      newTrip = await createMongoTrip({
          destination: tripParams.destination,
          originCity: tripParams.originCity,
          startDate: tripParams.startDate,
          days: 3,
          travelers: tripParams.travelers,
          budgetLimit: tripParams.budgetLimit,
          itinerary: fallbackItinerary,
        });
      if (newTrip) router.push(`/planner/${newTrip.id}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteMongoTrip(id);
      setSavedTrips(await getMongoTrips());
    } catch (error: any) {
      alert(error.message || "Could not delete trip from MongoDB");
    }
  };

  const handleInterestSelect = (dest: string) => {
    setDestination(dest);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Merged destination grid data (Featured Gateways + Popular Getaways)
  const allDestinations = [
    { city: "Kyoto",     emoji: "🌸", desc: "Wooden temples & zen gardens",       country: "Japan",     image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80", span: "md:col-span-2 md:row-span-2" },
    { city: "Tokyo",     emoji: "🗼", desc: "Neon skyline & ancient shrines",      country: "Japan",     image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80", span: "md:col-span-1 md:row-span-1" },
    { city: "Bali",      emoji: "🌴", desc: "Rice terraces & surf paradise",       country: "Indonesia", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80", span: "md:col-span-1 md:row-span-1" },
    { city: "Paris",     emoji: "🗼", desc: "Art, romance & iconic boulevards",    country: "France",    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80", span: "md:col-span-1 md:row-span-1" },
    { city: "Goa",       emoji: "🏖️", desc: "Sundecks & coastal beach life",       country: "India",     image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80", span: "md:col-span-1 md:row-span-1" },
    { city: "Rome",      emoji: "🏛️", desc: "Ancient heritage & cobbled piazzas", country: "Italy",     image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80", span: "md:col-span-1 md:row-span-1" },
    { city: "Manali",    emoji: "🏔️", desc: "Snowy peak treks & valley trails",   country: "India",     image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80", span: "md:col-span-1 md:row-span-1" },
    { city: "Dubrovnik", emoji: "🏰", desc: "Adriatic walls & coastal forts",      country: "Croatia",   image: "https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=600&q=80", span: "md:col-span-1 md:row-span-1" },
    { city: "Varanasi",  emoji: "🪔", desc: "Spiritual river ghat ceremonies",    country: "India",     image: "https://images.unsplash.com/photo-1561361513-2d000a50f0db?auto=format&fit=crop&w=600&q=80", span: "md:col-span-1 md:row-span-1" },
  ];

  return (
    <div className="relative w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-20 text-[#221F1C]">
      
      {/* Background Mesh Gradient Blobs */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-teal-200/10 rounded-full filter blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-40 right-1/4 w-96 h-96 bg-coral-500/10 rounded-full filter blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/3 w-72 h-72 bg-emerald-200/5 rounded-full filter blur-3xl pointer-events-none -z-10" />
      
      {/* Subtle World Map Watermark Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#221f1c_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03] pointer-events-none -z-10" />

      {/* Animated SVG Travel Routes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none -z-10 hidden lg:block" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 150 C 250 50, 450 250, 750 100" fill="none" stroke="rgba(58, 150, 135, 0.08)" strokeWidth="2" className="animate-route-dash" />
        <path d="M150 450 C 400 300, 550 550, 900 400" fill="none" stroke="rgba(76, 122, 191, 0.05)" strokeWidth="2" className="animate-route-dash" />
      </svg>

      {/* 1. HERO SECTION (2-COLUMN GRID) */}
      <motion.section style={{ y: heroY, opacity: heroOpacity }} className="relative min-h-[60vh] py-8 md:py-14 flex flex-col lg:grid lg:grid-cols-12 gap-10 lg:gap-20 items-center text-left">
        
        {/* Left Column: Headline, Description, Search, Indicators */}
        <div className="lg:col-span-7 flex flex-col items-start w-full pr-0 lg:pr-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-700 text-[10px] font-extrabold tracking-widest uppercase mb-4">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              AI-Powered Travel Planning for Groups
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-3xl md:text-5xl font-extrabold font-display leading-[1.1] tracking-tight text-slate-900 mb-4"
          >
            Plan Trips Together. <br />
            <span className="bg-gradient-to-r from-teal-600 via-teal-400 to-emerald-600 bg-clip-text text-transparent">
              Flights, Hotels & Budgets
            </span> <br />
            in One Place.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-slate-600 text-sm md:text-base lg:text-lg leading-relaxed mb-6 font-medium max-w-xl"
          >
            Your AI Travel Copilot for Stress-Free Trips. Design dynamic route maps, compare flight options, organize budgets, and curate itineraries with friends in real-time.
          </motion.p>

          {/* Search Form */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="w-full max-w-xl relative z-10 mb-4"
          >
            <form onSubmit={handleSearchSubmit} className="glass-panel border-gray-300/70 bg-[#FAF8F5]/95 p-3.5 rounded-2xl md:rounded-3xl shadow-soft flex flex-col gap-2.5">
              <div className="flex items-center gap-2 relative w-full min-w-0">
                <Search className="w-4.5 h-4.5 text-slate-500 ml-1.5 flex-shrink-0" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={`Where to? Try "${placeholderSuggestions[currentPlaceholderIdx]}"`}
                  className="flex-1 min-w-0 bg-transparent py-2 text-sm md:text-[15px] font-medium text-[#221F1C] placeholder:text-[#64748b] placeholder:font-medium focus:outline-none"
                  required
                />
                

                <button
                  type="submit"
                  disabled={generating}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-xs md:text-sm px-4.5 py-2.5 md:px-5 md:py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-40 flex-shrink-0 flex items-center gap-1.5 group"
                >
                  {generating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Start Planning Free</span>
                      <span className="sm:hidden">Plan</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>

              <div className="border-t border-gray-300/60 pt-2.5">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-[10px] font-bold text-teal-800 hover:text-teal-950 transition-colors uppercase tracking-wider"
                    >
                      {showAdvanced ? "▼ Simple Search" : "▲ Customize Dates & Budget"}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/compare")}
                      className="text-[10px] font-bold text-indigo-700 hover:text-indigo-950 transition-colors uppercase tracking-wider flex items-center gap-1"
                    >
                      ⚖️ Compare Destinations
                    </button>
                  </div>
                  <p className="hidden sm:block text-[9px] text-[#64748b] font-bold uppercase tracking-wider">
                    Examples: &ldquo;Kyoto under ₹90k&rdquo;
                  </p>
                </div>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-2.5 grid grid-cols-2 md:grid-cols-5 gap-2.5 text-left"
                    >
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Departure</label>
                        <input
                          type="text"
                          value={originCity}
                          onChange={(e) => setOriginCity(e.target.value)}
                          placeholder="Mumbai"
                          className="w-full glass-input px-3 py-2 rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={dates}
                          onChange={(e) => setDates(e.target.value)}
                          className="w-full glass-input px-3 py-2 rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">End Date</label>
                        <input
                          type="date"
                          value={endDate}
                          min={dates}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full glass-input px-3 py-2 rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Travelers</label>
                        <input
                          type="number"
                          min={1}
                          value={travelers}
                          onChange={(e) => setTravelers(Number(e.target.value))}
                          className="w-full glass-input px-3 py-2 rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Budget (Rs)</label>
                        <input
                          type="number"
                          value={budgetLimit}
                          onChange={(e) => setBudgetLimit(Number(e.target.value))}
                          className="w-full glass-input px-3 py-2 rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-bold text-slate-500 mb-6 pl-1 justify-start"
          >
            <span className="flex items-center gap-1 text-slate-650">✓ 10,000+ trips planned</span>
            <span className="flex items-center gap-1 text-slate-650">✓ Real-time flight data</span>
            <span className="flex items-center gap-1 text-slate-650">✓ AI itinerary workspace</span>
            <span className="flex items-center gap-1 text-slate-650">✓ Collaborative planning</span>
          </motion.div>

          {/* Recent Destination Chips */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap gap-1.5 items-center"
          >
            <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider flex items-center gap-1 mr-1">
              <History className="w-3.5 h-3.5" /> Try:
            </span>
            {[
              { label: "🏖️ Goa", query: "Goa" },
              { label: "🌸 Kyoto", query: "Kyoto" },
              { label: "🏔️ Manali", query: "Manali" },
              { label: "🕌 Varanasi", query: "Varanasi" }
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setDestination(chip.query)}
                className="px-2.5 py-1 rounded-full border border-gray-200 bg-white hover:border-teal-500/30 hover:bg-teal-500/5 text-[11px] text-slate-700 font-semibold transition-all duration-200 flex items-center gap-1 shadow-sm"
              >
                {chip.label}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Right Column: Interactive Trip Preview / Dashboard Mockup */}
        <div className="lg:col-span-5 w-full flex justify-center lg:justify-end relative mt-8 lg:mt-0 pr-0 lg:pr-4">
          {/* Floating pins behind the mockup */}
          <div className="absolute top-4 left-6 text-2xl animate-float-pin opacity-70" style={{ animationDelay: "0s" }}>📍</div>
          <div className="absolute bottom-10 right-4 text-2xl animate-float-pin opacity-70" style={{ animationDelay: "1.5s" }}>📍</div>
          <div className="absolute top-1/2 -right-8 text-2xl animate-float-pin opacity-60" style={{ animationDelay: "3s" }}>📍</div>

          {/* Main Mockup Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onClick={handlePreviewClick}
            className={`w-full max-w-[480px] rounded-3xl border border-gray-200/60 bg-[#FAF8F5]/85 backdrop-blur-md p-6 shadow-xl relative overflow-hidden flex flex-col gap-4.5 text-left ${latestTrip ? "cursor-pointer hover:border-teal-500/30 transition-all duration-355" : ""}`}
          >
            {/* Mockup Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{previewFlag}</span>
                  <h4 className="text-base font-black text-slate-900 font-display">{previewDest}</h4>
                </div>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  {latestTrip ? "Last Planned Trip" : "Spring Break"} • {previewDays} Days
                </p>
              </div>
              
              {/* Collaborators Stack */}
              <div className="flex items-center relative pr-2">
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-black text-xs flex items-center justify-center border border-white shadow-sm">A</div>
                <div className="w-8 h-8 rounded-full bg-coral-500 text-white font-black text-xs flex items-center justify-center border border-white -ml-2.5 shadow-sm">B</div>
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center border border-white -ml-2.5 shadow-sm">C</div>
                <span className="absolute bottom-0 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white animate-pulse" />
              </div>
            </div>

            {/* Layered Cards */}
            <div className="flex flex-col gap-3.5 relative z-10">
              {/* 1. Map Route Segment */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/90 p-3.5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col gap-2 relative overflow-hidden"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-teal-750 bg-teal-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Itinerary Route</span>
                  <span className="text-[10px] font-bold text-slate-400">Day 1 Segment</span>
                </div>
                <div className="h-20 w-full rounded-xl bg-slate-50 border border-gray-100 flex items-center justify-center p-2 relative overflow-hidden">
                  <svg className="absolute left-[29px] right-[29px] top-[25px] h-2 w-[calc(100%-58px)] overflow-visible pointer-events-none" viewBox="0 0 100 8" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 0,4 Q 50,0 100,4" fill="none" stroke="rgba(20, 110, 120, 0.2)" strokeWidth="3" strokeLinecap="round" />
                    <path d="M 0,4 Q 50,0 100,4" fill="none" stroke="#0f766e" strokeWidth="1.5" strokeDasharray="4 3" className="animate-route-dash" strokeLinecap="round" />
                    <g>
                      <path 
                        d="M-5,-3.5 L4.5,0 L-5,3.5 L-2.5,0 Z" 
                        fill="#0f766e" 
                      />
                      <animateMotion 
                        dur="3.2s" 
                        repeatCount="indefinite" 
                        rotate="auto"
                        path="M 0,4 Q 50,0 100,4"
                      />
                    </g>
                  </svg>
                  <div className="absolute left-6 top-6 flex flex-col items-center">
                    <span className="w-2.5 h-2.5 bg-teal-600 rounded-full ring-4 ring-teal-500/20" />
                    <span className="text-[9px] font-bold text-slate-700 mt-1 max-w-[80px] truncate">{stop1}</span>
                  </div>
                  <div className="absolute right-6 top-6 flex flex-col items-center">
                    <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full ring-4 ring-emerald-500/20" />
                    <span className="text-[9px] font-bold text-slate-700 mt-1 max-w-[80px] truncate">{stop2}</span>
                  </div>
                </div>
              </motion.div>

              {/* 2. Flight Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-white/90 p-3.5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600">
                    <Plane className="w-[18px] h-[18px] transform rotate-45" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">{previewOrigin.substring(0, 8)} ⇄ {previewDest.split(",")[0].substring(0, 8)}</h5>
                    <p className="text-[10px] text-slate-505 font-bold mt-0.5">{latestTrip ? "Best Route Deal" : "ANA NH-828 • Direct"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-600">₹{flightPrice.toLocaleString("en-IN")}</p>
                  <p className="text-[9px] text-teal-755 bg-teal-500/10 px-1.5 py-0.5 rounded-full font-bold mt-1 uppercase tracking-wider">✓ Selected</p>
                </div>
              </motion.div>

              {/* 3. Hotel Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white/90 p-3.5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                    <Hotel className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      {latestTrip ? `${previewDest.split(",")[0]} Lodge` : "Park Hyatt Tokyo"}
                    </h5>
                    <p className="text-[10px] text-slate-505 font-bold mt-0.5">★ 4.8 curated ratings</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-600">₹{hotelPrice.toLocaleString("en-IN")}/n</p>
                  <p className="text-[9px] text-teal-755 font-bold mt-1 uppercase tracking-wider">Saved to Deck</p>
                </div>
              </motion.div>

              {/* 4. Budget Tracking Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.75 }}
                className="bg-white/90 p-3.5 rounded-2xl border border-gray-200/60 shadow-sm flex justify-between items-center gap-3"
              >
                <div>
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Expense Tracker</h5>
                  <p className="text-[11px] text-slate-505 font-bold mt-0.5">Spent: ₹{totalSpent.toLocaleString("en-IN")} / ₹{totalBudget.toLocaleString("en-IN")}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center relative shadow-inner" style={{ background: `conic-gradient(#0f766e ${spentPct}%, #e2e8f0 ${spentPct}% 100%)` }}>
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-black text-[#221F1C]">{spentPct}%</div>
                </div>
              </motion.div>
            </div>
            
            {/* Background Grid Pattern watermark */}
            <div className="absolute inset-0 bg-[radial-gradient(#0f766e_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
          </motion.div>
        </div>
      </motion.section>

      {/* FEATURE HIGHLIGHT CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20 text-left">
        {[
          {
            title: "AI Itinerary",
            emoji: "🧠",
            desc: "Create day-by-day itineraries tailored to your travel style, pace, and budget in seconds.",
            icon: Brain,
            color: "teal"
          },
          {
            title: "Flight Search",
            emoji: "✈️",
            desc: "Compare real-time flight deals and multi-segment routing options directly inside your workspace.",
            icon: Plane,
            color: "coral"
          },
          {
            title: "Accommodations",
            emoji: "🏨",
            desc: "Discover matching hotels with live pricing and reviews curated for your group size.",
            icon: Hotel,
            color: "emerald"
          },
          {
            title: "Group Budgeting",
            emoji: "💰",
            desc: "Categorize expenses, split shared costs, and monitor real-time group spending targets.",
            icon: Coins,
            color: "amber"
          }
        ].map((feat, idx) => {
          const Icon = feat.icon;
          const bgColors = {
            teal:    "bg-teal-50 border-teal-200/50 text-teal-600",
            coral:   "bg-coral-50 border-coral-200/50 text-coral-600",
            emerald: "bg-emerald-50 border-emerald-200/50 text-emerald-600",
            amber:   "bg-amber-50 border-amber-200/50 text-amber-600"
          }[feat.color as "teal" | "coral" | "emerald" | "amber"];

          return (
            <ScrollReveal key={idx} delay={idx * 0.08} direction="up">
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="p-7 min-h-[245px] rounded-2xl border border-slate-200 bg-white/90 shadow-md hover:shadow-xl hover:border-teal-500/25 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full"
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl ${bgColors} border flex items-center justify-center mb-5 shadow-sm`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base md:text-lg font-extrabold text-slate-900 font-display tracking-tight mb-2 flex items-center gap-1.5">
                    <span>{feat.emoji}</span>
                    <span>{feat.title}</span>
                  </h3>
                  <p className="text-xs md:text-[13px] text-slate-600 leading-relaxed font-medium">
                    {feat.desc}
                  </p>
                </div>
              </motion.div>
            </ScrollReveal>
          );
        })}
      </section>

      {/* 2. DESTINATIONS GRID */}
      <ScrollReveal>
        <section className="mb-16">
          <div className="mb-6 text-left">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#666059] block mb-1">Top Picks Worldwide</span>
            <h2 className="text-xl md:text-2xl font-extrabold font-display text-[#221F1C] flex items-center gap-2">
              <Compass className="w-5 h-5 text-teal-600" />
              Popular Destinations
            </h2>
            <p className="text-xs text-[#666059] mt-0.5">Tap any destination to instantly pre-fill the trip planner</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 auto-rows-[165px]">
            {allDestinations.map((dest, idx) => (
              <ScrollReveal key={idx} delay={idx * 0.08} direction="right">
                <motion.div
                  whileHover={{ y: -6, scale: 1.01 }}
                  onClick={() => handleInterestSelect(dest.city)}
                  className={`group overflow-hidden rounded-card-ds border border-slate-200 bg-white shadow-card-ds hover:shadow-elevated-ds transition-all duration-300 cursor-pointer flex flex-col text-left h-full ${dest.span}`}
                >
                  <div className="relative w-full flex-grow overflow-hidden min-h-[110px]">
                    <ImageWithFallback
                      src={dest.image}
                      alt={dest.city}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      fallbackText={dest.city}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute top-2.5 left-2.5 text-xs bg-white/95 px-2.5 py-0.5 rounded-full shadow-sm font-extrabold text-slate-800 flex items-center gap-1">
                      <span>{dest.emoji}</span>
                      <span>{dest.city}</span>
                    </span>
                  </div>
                  <div className="p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-teal-850">{dest.country}</h3>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-semibold mt-0.5 truncate">{dest.desc}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-700 mt-2 group-hover:text-teal-900 transition-colors">
                      <span>Plan trip</span>
                      <ArrowRight className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              </ScrollReveal>
            ))}

            {/* AI prompt CTA tile */}
            <ScrollReveal delay={allDestinations.length * 0.08} direction="right">
              <motion.div
                whileHover={{ y: -6, scale: 1.01 }}
                onClick={() => { setDestination(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="group overflow-hidden rounded-card-ds border border-teal-200/50 bg-gradient-to-br from-teal-950 to-teal-800 p-5 shadow-card-ds hover:shadow-elevated-ds transition-all duration-300 cursor-pointer flex flex-col justify-between text-left md:col-span-1 md:row-span-1 h-full"
              >
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded-full">AI Planner</span>
                  <h3 className="text-sm font-bold font-display text-white mt-2.5 leading-snug">Suggest another hotspot?</h3>
                  <p className="text-[10px] text-slate-300 mt-1 leading-normal font-medium">Type any destination in the copilot search box.</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-extrabold text-teal-400 mt-2">
                  <span>Try prompts free</span>
                  <Sparkles className="w-3 h-3 text-teal-400 animate-pulse" />
                </div>
              </motion.div>
            </ScrollReveal>
          </div>
        </section>
      </ScrollReveal>

      {/* 2.5 PENDING CO-TRAVELER INVITATIONS BANNER & CARDS */}
      {invitations.length > 0 && (
        <ScrollReveal delay={0.05}>
          <section className="mb-10 p-6 rounded-3xl border border-teal-300/50 bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-white/70 shadow-lg text-left backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-md">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black font-display text-gray-900 leading-tight">
                  Pending Co-Traveler Invitations ({invitations.length})
                </h2>
                <p className="text-[11px] text-gray-500 font-semibold">
                  Accept an invitation to add the full itinerary and budget planner to your workspace.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="p-4 rounded-2xl bg-white/90 border border-teal-200/60 shadow-sm flex flex-col justify-between gap-3 hover:border-teal-500/40 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-500/10 px-2 py-0.5 rounded-full">
                        {invite.days} Days • {invite.originCity || "Origin"} ➔ {invite.destination}
                      </span>
                      <h3 className="text-base font-extrabold text-gray-900 mt-1 font-display flex items-center gap-1.5">
                        <span>{invite.destination}</span>
                        <span>{getFlagEmoji(invite.destination)}</span>
                      </h3>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Start: {invite.startDate || "TBD"} • {invite.travelers} Traveler(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      disabled={respondingId === invite.id}
                      onClick={(e) => handleRespondInvitation(invite.id, "accept", e)}
                      className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{respondingId === invite.id ? "Accepting..." : "Accept & Join"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={respondingId === invite.id}
                      onClick={(e) => handleRespondInvitation(invite.id, "decline", e)}
                      className="py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-600 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      title="Decline invitation"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* 3. SAVED / SYNCED CLOUD ITINERARIES LIST */}
      {savedTrips.length > 0 && (
        <ScrollReveal delay={0.1}>
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-extrabold font-display text-[#221F1C] flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#4C7ABF]" />
                Your MongoDB Trips
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {savedTrips.map((trip, idx) => {
                const attractionsCount = (trip.itinerary && trip.itinerary.length > 0) 
                  ? trip.itinerary.reduce((sum: number, d: any) => sum + (d.activities?.length || 0), 0) 
                  : 3;
                
                return (
                  <ScrollReveal key={trip.id} delay={idx * 0.08} direction="up">
                    <div
                      onClick={() => router.push(`/planner/${trip.id}`)}
                      className="group p-5 rounded-card-ds border border-slate-200/60 bg-white shadow-card-ds hover:shadow-elevated-ds hover:border-teal-500/20 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[175px] text-left h-full"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/15">
                            {trip.days} Days
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/compare?a=${trip.id}`);
                              }}
                              className="text-[9px] font-extrabold text-indigo-700 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/15 px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors cursor-pointer"
                              title="Compare destinations"
                            >
                              Compare
                            </button>
                            <span className="text-[9px] font-extrabold text-teal-750 bg-teal-500/10 border border-teal-500/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Status: Planning
                            </span>
                            <button
                              onClick={(e) => handleDeleteSaved(trip.id, e)}
                              className="p-1.5 rounded-full hover:bg-red-500/10 text-gray-450 hover:text-red-500 transition-colors"
                              title="Delete Trip"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-900 mt-3 font-display flex items-center gap-1.5">
                          <span>{trip.destination}</span>
                          <span>{getFlagEmoji(trip.destination)}</span>
                        </h3>
                        
                        <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                          Origin: {trip.originCity} • {trip.travelers} Pax
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] text-slate-650 border-t border-gray-150 pt-3 mt-4">
                        <span className="flex items-center gap-1 font-bold text-teal-850">
                          💰 Budget: ₹{trip.budgetLimit.toLocaleString("en-IN")}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-teal-700">
                          📍 {attractionsCount} Attractions
                        </span>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </section>
        </ScrollReveal>
      )}

      {/* 4. AI WORKSPACE SHOWCASE (NEW) */}
      <ScrollReveal delay={0.1}>
        <section className="mb-16 p-6 md:p-8 rounded-3xl border border-gray-200/40 bg-[#FAF8F5] shadow-soft">
          <div className="max-w-xl text-left mb-8">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#3A9687] block mb-1">Workspace Highlights</span>
            <h2 className="text-xl md:text-2xl font-extrabold font-display text-[#221F1C]">
              Single Workspace, Zero Clutter.
            </h2>
            <p className="text-xs text-[#666059] mt-1.5 leading-relaxed">
              Stop scanning dozens of browser tabs. Plan, cache, and schedule your trip activities, flights, hotels, and packing lists all in one responsive interface.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {[
              { icon: Navigation, color: "text-teal-650", bg: "bg-teal-500/10 border-teal-500/20", title: "1. Map Routing", desc: "Auto-resolved GPS coordinates display your day stops on an interactive routing line." },
              { icon: Landmark, color: "text-[#4C7ABF]", bg: "bg-[#4C7ABF]/10 border-[#4C7ABF]/20", title: "2. Deal Curation", desc: "Scan matching flights and hotels integrated straight into your itinerary planner sidebar." },
              { icon: CloudSun, color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20", title: "3. Weather Advice", desc: "Monitor dynamic forecast metrics and auto-generate category-specific packing advice." },
              { icon: Sparkles, color: "text-purple-600", bg: "bg-purple-500/10 border-purple-500/20", title: "4. AI Co-Pilot", desc: "Refine locations, ask budget allocation tips, or re-organize days by talking to your co-pilot." }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <ScrollReveal key={idx} delay={idx * 0.08} direction="up">
                  <div className="p-5 rounded-2xl border border-gray-200/30 bg-white/70 shadow-sm h-full">
                    <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1">{item.title}</h3>
                    <p className="text-[11px] text-[#666059] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

    </div>
  );
}
