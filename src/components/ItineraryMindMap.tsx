"use client";

import { useMemo, useRef, useState } from "react";
import { BedDouble, ChevronDown, ChevronRight, Clock3, MapPin, Navigation, Route, Sparkles, Utensils, X, ZoomIn, ZoomOut } from "lucide-react";
import type { Trip, TripActivity } from "@/types/trip";

type Kind = "place" | "hotel" | "food";
type Detail = { activity: TripActivity; day: number } | null;

const getKind = (activity: TripActivity): Kind => {
  const text = `${activity.name} ${activity.description}`.toLowerCase();
  if (/hotel|resort|stay|hostel|inn|lodge/.test(text)) return "hotel";
  if (/restaurant|cafe|food|breakfast|lunch|dinner|eat|bistro/.test(text)) return "food";
  return "place";
};

const palette = {
  place: { label: "Place", icon: MapPin, main: "#0f766e", light: "#ccfbf1", ring: "#5eead4" },
  hotel: { label: "Stay", icon: BedDouble, main: "#7c3aed", light: "#ede9fe", ring: "#c4b5fd" },
  food: { label: "Food", icon: Utensils, main: "#c2410c", light: "#ffedd5", ring: "#fdba74" },
};

export default function ItineraryMindMap({ trip }: { trip: Trip }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(.82);
  const [pan, setPan] = useState({ x: 28, y: 24 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [detail, setDetail] = useState<Detail>(null);
  const maxStops = Math.max(1, ...trip.itinerary.map(day => day.activities.length));
  const canvasWidth = Math.max(1280, 330 + trip.itinerary.length * 300);
  const canvasHeight = Math.max(720, 350 + maxStops * 96);
  const budget = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(trip.budgetLimit || 0);

  const connections = useMemo(() => trip.itinerary.flatMap((day, index) => {
    const x = 350 + index * 300;
    const paths = [{ id: `trip-${day.dayNumber}`, d: `M 275 300 C 310 300, ${x - 42} 230, ${x} 230` }];
    if (!collapsed.has(day.dayNumber)) {
      day.activities.forEach((_, activityIndex) => {
        const y = 330 + activityIndex * 96;
        paths.push({ id: `${day.dayNumber}-${activityIndex}`, d: `M ${x + 88} 255 C ${x + 88} ${y - 30}, ${x + 88} ${y - 20}, ${x + 88} ${y}` });
      });
    }
    return paths;
  }), [trip.itinerary, collapsed]);

  const changeZoom = (amount: number) => setZoom(current => Math.min(1.25, Math.max(.45, current + amount)));
  const resetCanvas = () => { setZoom(.82); setPan({ x: 28, y: 24 }); };

  return <section className="relative h-full min-h-[680px] overflow-hidden rounded-[28px] border border-slate-200 bg-[#f7f9fc] shadow-[0_20px_55px_-35px_rgba(15,23,42,.45)]">
    <header className="absolute inset-x-0 top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-600/20"><Sparkles className="h-4 w-4" /></span><div><p className="text-[9px] font-extrabold uppercase tracking-[.18em] text-teal-600">Live itinerary graph</p><h2 className="text-sm font-bold tracking-tight text-slate-800">{trip.destination} travel mind map</h2></div></div>
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"><button onClick={() => changeZoom(-.1)} aria-label="Zoom out" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"><ZoomOut className="h-4 w-4" /></button><button onClick={resetCanvas} className="min-w-11 px-2 text-[10px] font-bold text-slate-500">{Math.round(zoom * 100)}%</button><button onClick={() => changeZoom(.1)} aria-label="Zoom in" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"><ZoomIn className="h-4 w-4" /></button></div>
    </header>

    <div ref={viewport} className="relative mt-[67px] h-[612px] touch-none cursor-grab overflow-hidden active:cursor-grabbing" onPointerDown={event => { if ((event.target as HTMLElement).closest("button,a")) return; event.currentTarget.setPointerCapture(event.pointerId); setDrag({ x: event.clientX - pan.x, y: event.clientY - pan.y }); }} onPointerMove={event => drag && setPan({ x: event.clientX - drag.x, y: event.clientY - drag.y })} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)} onWheel={event => { event.preventDefault(); changeZoom(event.deltaY > 0 ? -.06 : .06); }}>
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(#cbd5e1 1.15px, transparent 1.15px)", backgroundSize: "22px 22px" }} />
      <div className="absolute origin-top-left transition-transform duration-150" style={{ width: canvasWidth, height: canvasHeight, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <svg aria-hidden="true" className="absolute inset-0 overflow-visible" width={canvasWidth} height={canvasHeight}><defs><linearGradient id="trip-line" x1="0" x2="1"><stop stopColor="#2dd4bf" /><stop offset="1" stopColor="#a5b4fc" /></linearGradient></defs>{connections.map(line => <path key={line.id} d={line.d} fill="none" stroke="url(#trip-line)" strokeWidth="2.5" strokeDasharray="5 7" strokeLinecap="round" />)}</svg>

        <article className="absolute left-6 top-[224px] w-[250px] overflow-hidden rounded-[22px] border border-teal-300 bg-gradient-to-br from-teal-600 via-teal-600 to-cyan-600 p-5 text-white shadow-[0_24px_50px_-25px_rgba(13,148,136,.9)]"><div className="absolute -right-5 -top-6 h-24 w-24 rounded-full bg-white/10" /><p className="relative text-[10px] font-extrabold uppercase tracking-[.2em] text-teal-100">✈ Your trip</p><h3 className="relative mt-2 text-xl font-bold leading-tight">{trip.originCity || "Start"}<span className="mx-1 text-teal-200">→</span>{trip.destination}</h3><div className="relative mt-4 grid grid-cols-2 gap-2 border-t border-white/20 pt-3 text-[10px] text-teal-50"><span><b className="block text-sm text-white">{trip.days}</b>days</span><span><b className="block text-sm text-white">₹{budget}</b>budget</span><span><b className="block text-sm text-white">{trip.travelers}</b>travellers</span><span><b className="block text-sm text-white">{trip.itinerary.length}</b>planned days</span></div></article>

        {trip.itinerary.map((day, dayIndex) => {
          const x = 350 + dayIndex * 300;
          const isClosed = collapsed.has(day.dayNumber);
          return <div key={day.dayNumber} className="absolute" style={{ left: x, top: 200 }}>
            <button onClick={() => setCollapsed(current => { const next = new Set(current); next.has(day.dayNumber) ? next.delete(day.dayNumber) : next.add(day.dayNumber); return next; })} className="group flex w-[176px] items-center justify-between rounded-2xl border border-indigo-200 bg-white p-2 text-left shadow-[0_12px_28px_-18px_rgba(49,46,129,.8)] transition hover:-translate-y-0.5 hover:shadow-lg"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xs font-black text-white shadow-sm">{day.dayNumber}</span><span className="ml-2 min-w-0 flex-1"><span className="block text-[9px] font-extrabold uppercase tracking-wider text-indigo-500">Day plan</span><span className="block truncate text-[11px] font-bold text-slate-700">{day.theme || trip.destination}</span></span><span className="rounded-lg p-1 text-indigo-500 group-hover:bg-indigo-50">{isClosed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span></button>
            {!isClosed && <div className="relative mt-[62px] space-y-3">{day.activities.length ? day.activities.map((activity, activityIndex) => <StopNode key={activity.id} activity={activity} index={activityIndex} onSelect={() => setDetail({ activity, day: day.dayNumber })} />) : <p className="w-[176px] rounded-xl border border-dashed border-slate-300 bg-white/80 p-3 text-center text-[10px] font-medium text-slate-400">No stops planned yet</p>}<p className="mt-1 w-[176px] text-center text-[9px] font-semibold text-slate-400"><Route className="mr-1 inline h-3 w-3 text-teal-500" />route follows this order</p></div>}
          </div>;
        })}
      </div>
    </div>
    <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-[10px] font-semibold text-slate-500 shadow-sm">Drag canvas to pan <span className="mx-1 text-slate-300">·</span> scroll to zoom <span className="mx-1 text-slate-300">·</span> click any stop for details</div>
    <div className="absolute bottom-4 right-4 z-10 hidden rounded-xl border border-slate-200 bg-white/90 p-2 shadow-sm md:flex"><Legend color="#0f766e" label="Place" /><Legend color="#7c3aed" label="Stay" /><Legend color="#c2410c" label="Food" /></div>
    {detail && <DetailPanel detail={detail} trip={trip} onClose={() => setDetail(null)} />}
  </section>;
}

function StopNode({ activity, index, onSelect }: { activity: TripActivity; index: number; onSelect: () => void }) {
  const kind = getKind(activity); const design = palette[kind]; const Icon = design.icon;
  return <button onClick={onSelect} className="group relative flex w-[176px] items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-[0_10px_20px_-16px_rgba(15,23,42,.8)] transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"><span className="absolute -left-[33px] top-1/2 h-px w-[28px] -translate-y-1/2 border-t-2 border-dashed border-slate-300" /><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: design.light, color: design.main }}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-slate-700">{activity.name}</span><span className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-400"><Clock3 className="h-3 w-3" />{activity.time || `Stop ${index + 1}`}</span></span></button>;
}

function Legend({ color, label }: { color: string; label: string }) { return <span className="mx-1 flex items-center gap-1.5 text-[9px] font-bold text-slate-500"><i className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span>; }

function DetailPanel({ detail, trip, onClose }: { detail: Exclude<Detail, null>; trip: Trip; onClose: () => void }) {
  const kind = getKind(detail.activity); const design = palette[kind]; const Icon = design.icon;
  const query = detail.activity.lat && detail.activity.lng ? `${detail.activity.lat},${detail.activity.lng}` : `${detail.activity.name}, ${trip.destination}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const facts = [detail.activity.time && `Schedule · ${detail.activity.time}`, detail.activity.openingHours && `Hours · ${detail.activity.openingHours}`, detail.activity.estimatedVisitDuration && `Visit · ${detail.activity.estimatedVisitDuration}`, detail.activity.distanceFromPrevious && `Distance · ${detail.activity.distanceFromPrevious}`, detail.activity.travelTimeFromPrevious && `Travel · ${detail.activity.travelTimeFromPrevious}`, detail.activity.transportType && `By ${detail.activity.transportType}`, detail.activity.rating && `Rating · ${detail.activity.rating} ★`, detail.activity.price && `Price · ${detail.activity.price}`, detail.activity.cuisine && `Cuisine · ${detail.activity.cuisine}`, detail.activity.checkIn && `Check-in · ${detail.activity.checkIn}`, detail.activity.checkOut && `Check-out · ${detail.activity.checkOut}`].filter(Boolean);
  return <div className="absolute inset-0 z-40 flex items-end bg-slate-950/30 p-3 backdrop-blur-[2px] md:items-center md:justify-end md:p-6" onClick={onClose}><article className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-2xl" onClick={event => event.stopPropagation()}>{detail.activity.imageUrl && <img src={detail.activity.imageUrl} alt={detail.activity.name} className="h-40 w-full object-cover" />}<div className="p-5"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: design.light, color: design.main }}><Icon className="h-5 w-5" /></span><div><p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: design.main }}>{design.label} · Day {detail.day}</p><h3 className="text-lg font-bold text-slate-800">{detail.activity.name}</h3></div></div><button onClick={onClose} aria-label="Close details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><p className="mt-4 text-sm leading-relaxed text-slate-600">{detail.activity.description || "This stop is ready for notes and itinerary enrichment."}</p>{facts.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2">{facts.map((fact, index) => <span key={index} className="rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] font-medium text-slate-600">{fact}</span>)}</div>}<a href={mapUrl} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-xs font-bold text-white transition hover:bg-slate-700"><Navigation className="h-4 w-4" />Navigate with Google Maps</a></div></article></div>;
}
