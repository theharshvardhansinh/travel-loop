"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  Calendar, Users, MapPin, Compass, Landmark, Briefcase, Globe
} from "lucide-react";
import { useActiveTrip, updateTripRecord } from "@/lib/store";
import ImageWithFallback from "@/components/ImageWithFallback";

// Dynamic Import for Leaflet Map to avoid SSR compilation errors
const Map = dynamic(() => import("@/components/Map"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-gray-50 animate-pulse flex items-center justify-center text-gray-400 rounded-2xl border border-gray-200">
      Loading Interactive Map Router...
    </div>
  )
});

const CATEGORY_COLORS: Record<string, string> = {
  Flights: "#4C7ABF",
  Hotels: "#3A9687",
  Food: "#4C8C5A",
  Activities: "#D49D42",
  "Shopping & Misc": "#666059",
};

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const { trip, isLoading } = useActiveTrip(tripId);

  // Active UI States
  const [activeDay, setActiveDay] = useState(1);
  const [activeTab, setActiveTab] = useState<"itinerary" | "budget" | "packing">("itinerary");

  // Invite states
  const searchParams = useSearchParams();
  const isInvite = searchParams?.get("invite") === "1";
  const [collabName, setCollabName] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !collabName.trim()) return;
    setIsJoining(true);

    const getTravellerNames = (t: typeof trip) => {
      if (!t) return ["You"];
      if (t.travellerNames && t.travellerNames.length > 0) {
        return [...t.travellerNames];
      }
      const names = ["You"];
      for (let i = 2; i <= t.travelers; i++) {
        names.push(`Traveler ${i}`);
      }
      return names;
    };

    const currentNames = getTravellerNames(trip);
    const updatedNames = currentNames.includes(collabName.trim()) ? currentNames : [...currentNames, collabName.trim()];

    let updatedEmails = trip.collaboratorEmails || [];
    try {
      const authRes = await fetch("/api/auth/me");
      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData?.user?.email) {
          const userEmail = authData.user.email.toLowerCase().trim();
          if (!updatedEmails.includes(userEmail)) {
            updatedEmails = [...updatedEmails, userEmail];
          }
        }
      }
    } catch {}

    await updateTripRecord({
      ...trip,
      travelers: updatedNames.length,
      travellerNames: updatedNames,
      collaboratorEmails: updatedEmails,
    });

    setIsJoining(false);
    router.push(`/planner/${trip.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 bg-[#FAF8F5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Loading shared trip sheet...</span>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 bg-[#FAF8F5] p-6 text-center">
        <Compass className="w-12 h-12 text-gray-300 mb-3" />
        <h2 className="text-lg font-bold text-gray-800">Trip Plan Not Found</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">The trip plan you are trying to view might have been deleted or the link is invalid.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 px-5 py-2.5 rounded-full bg-teal-600 text-white font-bold text-xs shadow-md hover:bg-teal-500 transition-colors"
        >
          Back to Homepage
        </button>
      </div>
    );
  }

  // Aggregate stats
  const totalSpent = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Aggregate category spending
  const categorySpends: Record<string, number> = {
    Flights: 0,
    Hotels: 0,
    Food: 0,
    Activities: 0,
    "Shopping & Misc": 0,
  };
  trip.expenses.forEach((e) => {
    if (categorySpends[e.category] !== undefined) {
      categorySpends[e.category] += e.amount;
    } else {
      categorySpends["Shopping & Misc"] += e.amount;
    }
  });

  let totalCatSpend = Object.values(categorySpends).reduce((sum, v) => sum + v, 0);
  if (totalCatSpend === 0) totalCatSpend = 1;

  let cumulativePercent = 0;
  const donutSegments = Object.keys(categorySpends).map((key) => {
    const value = categorySpends[key];
    const percentage = value / totalCatSpend;
    const startPercent = cumulativePercent;
    cumulativePercent += percentage;

    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${percentage * circumference} ${circumference}`;
    const strokeDashoffset = `${-startPercent * circumference}`;

    return {
      category: key,
      value,
      percentage: Math.round(percentage * 100),
      color: CATEGORY_COLORS[key],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeDayActivities = trip.itinerary.find((d) => d.dayNumber === activeDay)?.activities || [];

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 pt-20 pb-16 text-gray-800 bg-[#FAF8F5] min-h-screen">
      
      {isInvite && (
        <div className="mb-6 p-6 rounded-3xl border border-teal-200/60 bg-teal-500/5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 text-left animate-fade-in">
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] text-teal-700 font-extrabold bg-teal-500/10 px-2.5 py-0.5 rounded-full mb-1 uppercase tracking-wider">
              🎉 Invitation Received
            </span>
            <h2 className="text-base font-extrabold text-gray-900">You've been invited to collaborate on this trip!</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Enter your name below to join the shared workspace as a co-traveler.</p>
          </div>
          
          <form onSubmit={handleJoinTrip} className="flex gap-2 w-full md:max-w-xs">
            <input
              type="text"
              required
              value={collabName}
              onChange={(e) => setCollabName(e.target.value)}
              placeholder="Your name..."
              className="flex-grow glass-input px-3.5 py-2.5 rounded-xl text-xs placeholder-gray-400 focus:outline-none bg-white border border-gray-200"
            />
            <button
              type="submit"
              disabled={isJoining}
              className="px-5 py-2.5 bg-teal-650 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              {isJoining ? "Joining..." : "Join Trip"}
            </button>
          </form>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="p-6 md:p-8 rounded-3xl border border-gray-200/50 bg-white shadow-sm mb-8 text-left relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 bg-teal-500/10 border-b border-l border-teal-500/20 text-teal-700 text-[10px] font-black tracking-widest uppercase rounded-bl-2xl flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" /> Shared Trip Plan
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-extrabold bg-indigo-500/5 px-2.5 py-0.5 rounded-full mb-3 uppercase tracking-wider">
          Read-Only Access
        </span>
        <h1 className="text-2xl md:text-4xl font-extrabold font-display text-gray-900">{trip.destination} Plan</h1>
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-pink-500" /> Origin: {trip.originCity}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-indigo-500" /> Start: {trip.startDate}</span>
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-teal-600" /> {trip.travelers} Pax • {trip.days} Days</span>
        </div>
      </div>

      {/* MOBILE TAB TOGLE BAR */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 border border-gray-200 text-xs font-bold w-full mb-6 md:hidden">
        {["itinerary", "budget", "packing"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-2 rounded-lg text-center transition-all uppercase tracking-wider text-[10px] ${
 activeTab === tab ? "bg-white text-teal-700 shadow" : "text-gray-400"
 }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* COLUMN 1: DAY TIMELINE FEED (Visible on Desktop OR Itinerary Tab on Mobile) */}
        <div className={`col-span-1 md:col-span-4 flex flex-col gap-4 text-left ${activeTab !== "itinerary" ? "hidden md:flex" : ""}`}>
          <h2 className="text-xs font-bold font-display uppercase tracking-wider text-gray-400">Day Timeline</h2>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {trip.itinerary.map((day) => (
              <div
                key={day.dayNumber}
                onClick={() => setActiveDay(day.dayNumber)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
 activeDay === day.dayNumber 
 ? "border-teal-500 bg-teal-500/5 shadow-sm" 
 : "border-gray-200 bg-white hover:border-gray-300"
 }`}
              >
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Day {day.dayNumber}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{day.theme || "Sightseeing Exploration"}</p>
                
                <div className="mt-3 space-y-1.5">
                  {day.activities.slice(0, 3).map((act, index) => (
                    <div key={act.id} className="text-[10px] text-gray-600 truncate flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                      <span>{act.name}</span>
                    </div>
                  ))}
                  {day.activities.length > 3 && (
                    <span className="text-[9px] text-teal-650 font-bold block mt-1">+ {day.activities.length - 3} more activities</span>
                  )}
                  {day.activities.length === 0 && (
                    <span className="text-[10px] text-gray-400 italic block">No activities planned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: INTERACTIVE MAP (Always visible, fits middle on desktop) */}
        <div className={`col-span-1 md:col-span-5 h-[400px] md:h-[500px] ${activeTab !== "itinerary" ? "hidden md:block" : ""}`}>
          <Map 
            activities={activeDayActivities} 
            destination={trip.destination}
            centerCoords={
              activeDayActivities[0]?.lat && activeDayActivities[0]?.lng
                ? { lat: activeDayActivities[0].lat, lng: activeDayActivities[0].lng }
                : null
            }
          />
        </div>

        {/* COLUMN 3: UTILITIES & LEDGER SUM (Visible on Desktop OR non-itinerary Tabs on Mobile) */}
        <div className="col-span-1 md:col-span-3 space-y-6 text-left">
          
          {/* BUDGET SUMMARY CARD */}
          <div className={`${activeTab !== "budget" && activeTab !== "itinerary" ? "hidden md:block" : ""}`}>
            <h2 className="text-xs font-bold font-display uppercase tracking-wider text-gray-400 mb-3">Budget Details</h2>
            <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col gap-4">
              <div className="border-b border-gray-100 pb-3">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Total Budget Limit</span>
                <span className="text-xl font-extrabold text-gray-800 font-display">₹{trip.budgetLimit.toLocaleString()}</span>
              </div>
              <div className="border-b border-gray-100 pb-3">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Total Spent</span>
                <span className="text-xl font-extrabold text-teal-700 font-display">₹{totalSpent.toLocaleString()}</span>
              </div>

              {/* Compact Donut breakdown */}
              <div className="flex items-center gap-4 justify-between mt-2 pt-2 border-t border-gray-50">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="35" className="fill-transparent stroke-gray-100 stroke-[8]" />
                    {donutSegments.map((seg, idx) => (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r="35"
                        className="fill-transparent stroke-[8]"
                        stroke={seg.color}
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                      />
                    ))}
                  </svg>
                </div>
                <div className="space-y-1 w-full max-w-[120px]">
                  {donutSegments.slice(0, 3).map((seg, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1 truncate w-4/5">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-gray-500 truncate">{seg.category}</span>
                      </div>
                      <span className="font-bold text-gray-700">{seg.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PACKING LIST SUMMARY CARD */}
          <div className={`${activeTab !== "packing" && activeTab !== "itinerary" ? "hidden md:block" : ""}`}>
            <h2 className="text-xs font-bold font-display uppercase tracking-wider text-gray-400 mb-3">Packing List</h2>
            <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col gap-3">
              <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {trip.packingList.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-1.5 rounded bg-gray-50/50 border border-gray-100 text-[11px] text-gray-600">
                    <input 
                      type="checkbox" 
                      checked={item.checked} 
                      disabled 
                      className="w-3.5 h-3.5 accent-teal-600 rounded flex-shrink-0 cursor-not-allowed" 
                    />
                    <span className={item.checked ? "line-through text-gray-400" : ""}>{item.name}</span>
                  </div>
                ))}
                {trip.packingList.length === 0 && (
                  <span className="text-xs text-gray-400 italic block text-center py-4">No items listed.</span>
                )}
                {trip.packingList.length > 8 && (
                  <span className="text-[10px] text-teal-650 font-semibold block text-center mt-2">+ {trip.packingList.length - 8} more packing items</span>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
