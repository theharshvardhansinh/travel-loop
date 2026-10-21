"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  MapPin, Calendar, Users, Globe, BookOpen, AlertCircle, ShieldAlert,
  Plus, Link2, UserPlus, Copy, Check, Bell, BellOff, X, Trash2, Mail
} from "lucide-react";
import { Trip, updateTripRecord } from "@/lib/store";
import ExportButtons from "./ExportButtons";
import { motion, AnimatePresence } from "framer-motion";
import { TripDay, TripActivity } from "@/types/trip";

interface TripHeaderProps {
  trip: Trip;
  isInternational: boolean | null;
}

interface Reminder {
  id: string;
  dayNumber: number;
  activityName: string;
  text: string;
}

export default function TripHeader({ trip, isInternational }: TripHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isJournalPage = pathname?.endsWith("/journal");

  // Dialog and panel states
  const [showTravellersModal, setShowTravellersModal] = useState(false);
  const [namesInput, setNamesInput] = useState<string[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTab, setInviteTab] = useState<"link" | "name" | "email">("link");
  
  // Custom modals/drawers
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showRemindersModal, setShowRemindersModal] = useState(false);

  // Invitation fields
  const [newCollabName, setNewCollabName] = useState("");
  const [newCollabEmail, setNewCollabEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Reminders fields
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderText, setReminderText] = useState("");
  const [reminderDay, setReminderDay] = useState(1);
  const [reminderActivity, setReminderActivity] = useState("");

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

  useEffect(() => {
    setNamesInput(getTravellerNames(trip));
  }, [trip.travellerNames, trip.travelers]);

  // Load reminders from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`tripmitra:reminders:${trip.id}`);
      if (stored) {
        setReminders(JSON.parse(stored));
      }
    }
  }, [trip.id]);

  const saveRemindersToStorage = (newReminders: Reminder[]) => {
    setReminders(newReminders);
    if (typeof window !== "undefined") {
      localStorage.setItem(`tripmitra:reminders:${trip.id}`, JSON.stringify(newReminders));
    }
  };

  const handleAddCollab = async (nameToAdd: string) => {
    const updatedNames = [...namesInput, nameToAdd.trim()];
    setNamesInput(updatedNames);
    await updateTripRecord({
      ...trip,
      travelers: updatedNames.length,
      travellerNames: updatedNames
    });
  };

  const handleAddCollabByName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollabName.trim()) return;
    await handleAddCollab(newCollabName.trim());
    setNewCollabName("");
    alert(`${newCollabName.trim()} added as a collaborator!`);
  };

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newCollabEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsSendingEmail(true);
    
    const existingCollabs = trip.collaborators || [];
    const collabExists = existingCollabs.some((c) => c.email?.toLowerCase().trim() === cleanEmail);
    const updatedCollabs = collabExists
      ? existingCollabs
      : [
          ...existingCollabs,
          {
            email: cleanEmail,
            name: cleanEmail.split("@")[0],
            status: "pending" as const,
            invitedAt: new Date().toISOString(),
          },
        ];

    const existingEmails = trip.collaboratorEmails || [];
    const updatedEmails = existingEmails.includes(cleanEmail) ? existingEmails : [...existingEmails, cleanEmail];

    await updateTripRecord({
      ...trip,
      collaboratorEmails: updatedEmails,
      collaborators: updatedCollabs,
    });

    setIsSendingEmail(false);
    setEmailSentSuccess(true);

    setTimeout(() => {
      setEmailSentSuccess(false);
      setNewCollabEmail("");
      setShowInviteModal(false);
    }, 1500);
  };

  const handleCopyInviteLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/share/${trip.id}?invite=1`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderText.trim()) return;

    const newReminder: Reminder = {
      id: Math.random().toString(36).substring(2, 9),
      dayNumber: reminderDay,
      activityName: reminderActivity || "General Info",
      text: reminderText.trim()
    };

    saveRemindersToStorage([...reminders, newReminder]);
    setReminderText("");
    setReminderActivity("");
  };

  const handleDeleteReminder = (id: string) => {
    saveRemindersToStorage(reminders.filter((r) => r.id !== id));
  };

  return (
    <div className="w-full mb-8">
      {/* Cohesive unified glass panel container */}
      <div className="w-full p-6 rounded-3xl glass-panel border border-slate-200/50 bg-white/70 shadow-sm text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Left Block: Badges, Title & Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-indigo-700 font-extrabold bg-indigo-500/10 px-2.5 py-0.75 rounded-full whitespace-nowrap">
                Trip Active • {trip.days} Days
              </span>
              
              {/* Transport Mode Badge */}
              <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.75 rounded-full border whitespace-nowrap ${
                trip.transportMode === "bike"
                  ? "bg-teal-500/10 text-teal-800 border-teal-500/30"
                  : trip.transportMode === "car"
                  ? "bg-indigo-500/10 text-indigo-800 border-indigo-500/30"
                  : trip.transportMode === "train"
                  ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/30"
                  : "bg-blue-500/10 text-blue-800 border-blue-500/30"
              }`}>
                {trip.transportMode === "bike"
                  ? "🏍️ Bike Road Trip"
                  : trip.transportMode === "car"
                  ? "🚗 Car Road Trip"
                  : trip.transportMode === "train"
                  ? "🚆 Train Journey"
                  : "✈️ Flight Trip"}
              </span>

              {/* Group Type Badge */}
              {trip.groupType && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-purple-700 font-extrabold bg-purple-500/10 px-2.5 py-0.75 rounded-full border border-purple-500/20 whitespace-nowrap">
                  {trip.groupType === "solo"
                    ? "👤 Solo"
                    : trip.groupType === "couple"
                    ? "💑 Couple"
                    : trip.groupType === "friends"
                    ? "👥 Friends Squad"
                    : "👨‍👩‍👦 Family"}
                </span>
              )}

              {/* Trip Vibe Badge */}
              {trip.tripVibe && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-800 font-extrabold bg-amber-500/10 px-2.5 py-0.75 rounded-full border border-amber-500/20 whitespace-nowrap">
                  {trip.tripVibe === "spiritual"
                    ? "🪔 Spiritual"
                    : trip.tripVibe === "adventures"
                    ? "🧗 Adventures"
                    : "🌲 Nature & Scenic"}
                </span>
              )}

              {/* Road Distance Badge */}
              {trip.routeDistanceKm && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-800 font-extrabold bg-emerald-500/15 px-2.5 py-0.75 rounded-full border border-emerald-500/30 whitespace-nowrap">
                  🛣️ {trip.routeDistanceKm} km {trip.routeDurationHours ? `(~${trip.routeDurationHours}h)` : ""}
                </span>
              )}

              {isInternational !== null && (
                isInternational ? (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-rose-700 font-extrabold bg-rose-500/10 px-2.5 py-0.75 rounded-full border border-rose-500/20 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.3)] whitespace-nowrap">
                    ✈️ International • Visa Required
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-700 font-extrabold bg-emerald-500/10 px-2.5 py-0.75 rounded-full border border-emerald-500/20 whitespace-nowrap">
                    Domestic Trip
                  </span>
                )
              )}
            </div>

            <h1 className="text-2xl md:text-3.5xl font-black font-display text-gray-900 tracking-tight leading-none mb-3 truncate">
              {trip.destination}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-pink-500" /> Origin: {trip.originCity || "Mumbai"}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500" /> Start: {trip.startDate || "TBD"}
              </span>
              <button
                type="button"
                onClick={() => setShowTravellersModal(true)}
                className="flex items-center gap-1.5 hover:bg-gray-150/80 px-2 py-1 rounded-lg transition-colors cursor-pointer text-left focus:outline-none"
                title="Edit Traveler Names"
              >
                <Users className="w-4 h-4 text-teal-600" />
                <span>{trip.travelers} Traveler(s)</span>
                <span className="text-[9px] text-indigo-650 font-extrabold hover:underline ml-1">(Edit)</span>
              </button>
            </div>
          </div>

          {/* Right Block: Aligned single row for Collaborators & Kebab */}
          <div className="flex items-center gap-4 py-1">
            
            {/* Collaborator Avatars */}
            <div className="flex items-center gap-1 bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex -space-x-2 overflow-hidden mr-1">
                <AnimatePresence initial={false}>
                  {namesInput.map((name, idx) => {
                    const colorClass = [
                      "bg-teal-500 border-white text-white",
                      "bg-indigo-500 border-white text-white",
                      "bg-pink-500 border-white text-white",
                      "bg-amber-500 border-white text-white",
                      "bg-purple-500 border-white text-white",
                      "bg-emerald-500 border-white text-white"
                    ][idx % 6];

                    return (
                      <motion.div
                        key={name + "-" + idx}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`w-7.5 h-7.5 rounded-full border-2 flex items-center justify-center text-[9px] font-black shadow-sm select-none ${colorClass}`}
                        title={name}
                      >
                        {name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Add Collaborator Button */}
              <div className="group relative">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="w-7.5 h-7.5 rounded-full border border-dashed border-gray-300 hover:border-teal-500 bg-white hover:bg-teal-50/20 text-gray-450 hover:text-teal-650 flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
                  aria-label="Invite Collaborator"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 hidden group-hover:inline-block bg-gray-900 text-white text-[9px] px-2 py-1 rounded shadow-md whitespace-nowrap z-50 pointer-events-none">
                  Invite Co-Traveler
                </span>
              </div>
            </div>

            {/* Consolidating Export/Share actions inside Kebab Menu */}
            <ExportButtons 
              trip={trip} 
              onTimelineClick={() => setShowTimelineModal(true)}
              onRemindersClick={() => setShowRemindersModal(true)}
            />
          </div>

        </div>
      </div>

      {/* --- TIMELINE PREVIEW MODAL --- */}
      <AnimatePresence>
        {showTimelineModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTimelineModal(false)}
              className="absolute inset-0 bg-gray-950/25 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg rounded-3xl glass-panel border border-slate-200 bg-white p-6 shadow-2xl flex flex-col max-h-[80vh] text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-black font-display text-gray-900">Itinerary Timeline</h3>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Quick scrollable overview of all planned stops</p>
                </div>
                <button
                  onClick={() => setShowTimelineModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Timeline */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar relative pl-4">
                <div className="absolute left-[23px] top-2 bottom-2 w-0.5 border-l-2 border-dashed border-slate-200" />

                {trip.itinerary.map((day: TripDay) => (
                  <div key={day.dayNumber} className="relative pl-8">
                    {/* Bullet */}
                    <div className="absolute left-[-2px] top-1 w-4 h-4 rounded-full border-2 border-amber-500 bg-white flex items-center justify-center z-10" />

                    <div>
                      <h4 className="text-xs font-black text-amber-650 tracking-wider uppercase mb-1">
                        Day {day.dayNumber} — {day.theme || "General Sights"}
                      </h4>

                      {day.activities.length === 0 ? (
                        <p className="text-[11px] text-gray-400 italic">No scheduled activities for this day.</p>
                      ) : (
                        <div className="space-y-3 mt-2 pl-2">
                          {day.activities.map((act: TripActivity, idx: number) => (
                            <div key={act.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                              <span className="text-[9px] font-extrabold uppercase bg-slate-200 text-slate-650 px-1.5 py-0.5 rounded">
                                {act.time || "Morning"}
                              </span>
                              <div className="min-w-0 flex-1">
                                <h5 className="text-[11px] font-bold text-gray-800">{act.name}</h5>
                                <p className="text-[10px] text-gray-500 mt-0.5 truncate">{act.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- REMINDERS MODAL --- */}
      <AnimatePresence>
        {showRemindersModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRemindersModal(false)}
              className="absolute inset-0 bg-gray-950/25 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md rounded-3xl glass-panel border border-slate-200 bg-white p-6 shadow-2xl flex flex-col max-h-[80vh] text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-black font-display text-gray-900">Trip Reminders</h3>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Manage localized alert notes for your travel agenda</p>
                </div>
                <button
                  onClick={() => setShowRemindersModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Set Reminder Form */}
              <form onSubmit={handleAddReminder} className="space-y-3 mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Target Day</label>
                    <select
                      value={reminderDay}
                      onChange={(e) => setReminderDay(Number(e.target.value))}
                      className="w-full glass-input px-3.5 py-2 rounded-xl text-xs focus:outline-none"
                    >
                      {trip.itinerary.map((d) => (
                        <option key={d.dayNumber} value={d.dayNumber}>Day {d.dayNumber}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Activity Name</label>
                    <select
                      value={reminderActivity}
                      onChange={(e) => setReminderActivity(e.target.value)}
                      className="w-full glass-input px-3.5 py-2 rounded-xl text-xs focus:outline-none"
                    >
                      <option value="">General (No Stop)</option>
                      {trip.itinerary.find((d) => d.dayNumber === reminderDay)?.activities.map((a) => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Reminder Alert Note</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Check check-in window, Pack waterproof bag"
                      value={reminderText}
                      onChange={(e) => setReminderText(e.target.value)}
                      className="flex-grow glass-input px-3.5 py-2 rounded-xl text-xs focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>

              {/* Reminders List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                <span className="text-[9px] font-bold text-gray-450 uppercase tracking-widest block mb-1">Active Reminders ({reminders.length})</span>
                {reminders.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic text-center py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">No scheduled reminders yet. Add one above!</p>
                ) : (
                  reminders.map((rem) => (
                    <div key={rem.id} className="p-3 rounded-xl border border-slate-100 bg-white shadow-xs flex items-center justify-between gap-2 group/item">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-100 px-1 rounded">Day {rem.dayNumber}</span>
                          <span className="text-[8.5px] font-bold text-gray-450 truncate max-w-[150px]">{rem.activityName}</span>
                        </div>
                        <p className="text-[11px] font-medium text-gray-800 mt-1">{rem.text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors opacity-80 hover:opacity-100"
                        title="Delete reminder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MANAGE TRAVELERS MODAL --- */}
      <AnimatePresence>
        {showTravellersModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTravellersModal(false)}
              className="absolute inset-0 bg-gray-950/20 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-3xl glass-panel border border-slate-200 bg-white p-6 shadow-xl flex flex-col gap-4 text-left"
            >
              <div>
                <h3 className="text-base font-bold font-display text-gray-900">Edit Traveler Names</h3>
                <p className="text-[10px] text-gray-500 mt-0.5 font-semibold">Names will sync dynamically to compute budget page splits.</p>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {Array.from({ length: trip.travelers }).map((_, i) => (
                  <div key={i}>
                    <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Traveler {i + 1} Name</label>
                    <input
                      type="text"
                      value={namesInput[i] || ""}
                      onChange={(e) => {
                        const next = [...namesInput];
                        next[i] = e.target.value;
                        setNamesInput(next);
                      }}
                      placeholder={i === 0 ? "You" : `Traveler ${i + 1}`}
                      className="w-full glass-input px-3.5 py-2 rounded-xl text-xs placeholder-gray-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowTravellersModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-505 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const finalNames = Array.from({ length: trip.travelers }).map((_, i) => {
                      return namesInput[i]?.trim() || (i === 0 ? "You" : `Traveler ${i + 1}`);
                    });
                    await updateTripRecord({
                      ...trip,
                      travellerNames: finalNames
                    });
                    setShowTravellersModal(false);
                  }}
                  className="flex-grow py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors"
                >
                  Save Names
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- INVITE COLLABORATOR MODAL --- */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInviteModal(false)}
              className="absolute inset-0 bg-gray-950/20 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm rounded-3xl glass-panel border border-slate-200 bg-white p-6 shadow-xl flex flex-col gap-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-bold font-display text-gray-900">Invite Collaborators</h3>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Bring co-travelers into your active workspace</p>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Extended Tabs including Email Invite */}
              <div className="flex p-0.5 rounded-xl bg-gray-100 border border-gray-150 text-[8.5px] font-bold w-full">
                <button
                  type="button"
                  onClick={() => setInviteTab("link")}
                  className={`flex-1 py-1.75 rounded-lg text-center transition-all uppercase tracking-wider ${
                    inviteTab === "link" ? "bg-white text-teal-700 shadow-sm" : "text-gray-400"
                  }`}
                >
                  Invite Link
                </button>
                <button
                  type="button"
                  onClick={() => setInviteTab("name")}
                  className={`flex-1 py-1.75 rounded-lg text-center transition-all uppercase tracking-wider ${
                    inviteTab === "name" ? "bg-white text-teal-700 shadow-sm" : "text-gray-400"
                  }`}
                >
                  Add By Name
                </button>
                <button
                  type="button"
                  onClick={() => setInviteTab("email")}
                  className={`flex-1 py-1.75 rounded-lg text-center transition-all uppercase tracking-wider ${
                    inviteTab === "email" ? "bg-white text-teal-700 shadow-sm" : "text-gray-400"
                  }`}
                >
                  Email Invite
                </button>
              </div>

              {inviteTab === "link" && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                    Copy the invitation link below and share it with your friends. When they join, they will be registered as trip collaborators.
                  </p>
                  
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== "undefined" ? `${window.location.origin}/share/${trip.id}?invite=1` : ""}
                      className="flex-grow glass-input px-3 py-2.5 rounded-xl text-xs select-all bg-gray-50/50 cursor-default focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow transition-colors"
                      title="Copy invite link"
                    >
                      {copiedLink ? <Check className="w-4.5 h-4.5" /> : <Copy className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>
              )}

              {inviteTab === "name" && (
                <form onSubmit={handleAddCollabByName} className="space-y-3 pt-2">
                  <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                    Quickly add a co-traveler's name to compute splits in the ledger and display them as a participant on this plan.
                  </p>

                  <div>
                    <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Co-Traveler Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCollabName}
                        onChange={(e) => setNewCollabName(e.target.value)}
                        placeholder="Rahul, Priya..."
                        required
                        className="flex-grow glass-input px-3.5 py-2.5 rounded-xl text-xs placeholder-gray-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {inviteTab === "email" && (
                <form onSubmit={handleSendEmailInvite} className="space-y-3 pt-2">
                  <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                    Send a direct email invitation. Once submitted, they will be registered to sync planning.
                  </p>

                  <div>
                    <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Email Address</label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={newCollabEmail}
                        onChange={(e) => setNewCollabEmail(e.target.value)}
                        placeholder="co-traveler@email.com"
                        required
                        className="flex-grow glass-input px-3.5 py-2.5 rounded-xl text-xs placeholder-gray-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isSendingEmail || emailSentSuccess}
                        className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-bold text-xs shadow transition-all flex items-center gap-1.5"
                      >
                        {isSendingEmail ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : emailSentSuccess ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Mail className="w-3.5 h-3.5" />
                        )}
                        <span>{emailSentSuccess ? "Sent" : "Invite"}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
