"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Compass, Landmark, Sparkles, LogIn, LogOut, User, Mail, Lock, Bell, Settings, ChevronDown, CheckCircle2 } from "lucide-react";

export default function BottomDock() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Notifications, Settings and Profile States & Refs
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const [currencyPref, setCurrencyPref] = useState("INR");
  const [realTimeSync, setRealTimeSync] = useState(true);
  const [offlineStorage, setOfflineStorage] = useState(true);

  const [notifications, setNotifications] = useState<any[]>([]);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch current user from MongoDB session
  const checkUserSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    checkUserSession();
  }, [pathname]);

  // Load settings on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem("currencyPreference");
    if (savedCurrency) setCurrencyPref(savedCurrency);

    const savedSync = localStorage.getItem("realTimeSync");
    if (savedSync !== null) setRealTimeSync(savedSync === "true");

    const savedOffline = localStorage.getItem("offlineStorage");
    if (savedOffline !== null) setOfflineStorage(savedOffline === "true");

    // Load notifications
    const local = localStorage.getItem("tripmitra_notifications");
    if (local) {
      try {
        setNotifications(JSON.parse(local));
      } catch {
        setNotifications([]);
      }
    } else {
      const defaults = [
        { id: "1", text: "✈️ Real-time MongoDB sync enabled for your trips!", time: "Just now", read: false },
        { id: "2", text: "💰 Smart split expense tracking is active", time: "2 hrs ago", read: false },
        { id: "3", text: "🗺️ Interactive itinerary planner ready to explore", time: "1 day ago", read: true },
      ];
      localStorage.setItem("tripmitra_notifications", JSON.stringify(defaults));
      setNotifications(defaults);
    }
  }, []);

  const handleSaveSettings = (selectedCurrency: string, syncVal: boolean, offlineVal: boolean) => {
    setCurrencyPref(selectedCurrency);
    setRealTimeSync(syncVal);
    setOfflineStorage(offlineVal);

    localStorage.setItem("currencyPreference", selectedCurrency);
    localStorage.setItem("realTimeSync", String(syncVal));
    localStorage.setItem("offlineStorage", String(offlineVal));

    alert("Settings saved successfully!");
    setShowSettings(false);
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map(item => ({ ...item, read: true }));
    setNotifications(updated);
    localStorage.setItem("tripmitra_notifications", JSON.stringify(updated));
  };

  // Click outside to close dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (showProfileDropdown && profileRef.current && !profileRef.current.contains(target)) {
        setShowProfileDropdown(false);
      }

      const insideMobileNotification = profileRef.current && profileRef.current.contains(target);
      const insideDesktopNotification = notificationsRef.current && notificationsRef.current.contains(target);
      if (showNotifications && !insideMobileNotification && !insideDesktopNotification) {
        setShowNotifications(false);
      }

      const insideMobileSettings = profileRef.current && profileRef.current.contains(target);
      const insideDesktopSettings = settingsRef.current && settingsRef.current.contains(target);
      if (showSettings && !insideMobileSettings && !insideDesktopSettings) {
        setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showNotifications, showSettings, showProfileDropdown]);

  // Reusable panel render functions
  const renderNotificationsPanel = (isMobile: boolean) => (
    <div className={`absolute ${isMobile ? "right-0 bottom-full mb-3" : "right-0 top-full mt-3"} w-80 rounded-2xl border border-gray-200 bg-[#FAF8F5]/95 backdrop-blur-md p-4 shadow-xl z-[999] text-left`}>
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[10px] font-extrabold text-[#221F1C] uppercase tracking-wider">Notifications</h4>
        <button 
          type="button"
          onClick={handleMarkAllRead} 
          className="text-[9px] text-teal-750 hover:text-teal-900 font-bold"
        >
          Mark all read
        </button>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {notifications.map(n => (
          <div 
            key={n.id} 
            className={`p-2.5 rounded-xl border text-[11px] leading-relaxed transition-all ${
              n.read 
                ? "bg-white/50 border-gray-200/50 text-[#666059]" 
                : "bg-teal-500/5 border-teal-500/10 text-slate-900 font-medium"
            }`}
          >
            <p className="text-slate-800">{n.text}</p>
            <span className="text-[9px] text-gray-400 block mt-1">{n.time}</span>
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="text-[10px] text-gray-400 italic text-center py-4">No notifications yet.</p>
        )}
      </div>
    </div>
  );

  const renderSettingsPanel = (isMobile: boolean) => (
    <div className={`absolute ${isMobile ? "right-0 bottom-full mb-3" : "right-0 top-full mt-3"} w-80 rounded-2xl border border-gray-200 bg-[#FAF8F5]/95 backdrop-blur-md p-5 shadow-xl z-[999] text-left`}>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-[11px] font-extrabold text-[#221F1C] uppercase tracking-wider">Workspace Settings</h4>
        {isMobile && (
          <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-650 text-xs">✕</button>
        )}
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Preferred Currency
          </label>
          <select 
            value={currencyPref}
            onChange={(e) => setCurrencyPref(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs focus:border-teal-500 outline-none text-slate-800"
          >
            <option value="INR">INR (₹) - Indian Rupee</option>
            <option value="USD">USD ($) - US Dollar</option>
            <option value="EUR">EUR (€) - Euro</option>
            <option value="GBP">GBP (£) - British Pound</option>
            <option value="JPY">JPY (¥) - Japanese Yen</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            MongoDB Sync Mode
          </label>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 border border-gray-150">
            <div>
              <p className="text-xs font-semibold text-[#221F1C]">Cloud Database Sync</p>
              <p className="text-[9px] text-[#666059]">Sync itineraries with MongoDB</p>
            </div>
            <input 
              type="checkbox" 
              checked={realTimeSync}
              onChange={(e) => setRealTimeSync(e.target.checked)}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" 
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Offline Storage
          </label>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 border border-gray-150">
            <div>
              <p className="text-xs font-semibold text-[#221F1C]">LocalStorage Cache</p>
              <p className="text-[9px] text-[#666059]">Persist changes locally when offline</p>
            </div>
            <input 
              type="checkbox" 
              checked={offlineStorage}
              onChange={(e) => setOfflineStorage(e.target.checked)}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" 
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => handleSaveSettings(currencyPref, realTimeSync, offlineStorage)}
        className="mt-5 w-full bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all duration-200 cursor-pointer"
      >
        Save Settings
      </button>
    </div>
  );

  // Auto-detect the active trip ID from the URL path
  useEffect(() => {
    const parts = pathname.split("/");
    if ((parts[1] === "planner" || parts[1] === "budget") && parts[2]) {
      setActiveTripId(parts[2]);
      localStorage.setItem("activeTripId", parts[2]);
    } else {
      const stored = localStorage.getItem("activeTripId");
      if (stored) {
        setActiveTripId(stored);
      }
    }
  }, [pathname]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput.trim()) return;

    setLoading(true);
    setAuthMsg(null);

    const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
    const payload = isRegistering
      ? { email: emailInput.trim(), password: passwordInput, name: nameInput.trim() }
      : { email: emailInput.trim(), password: passwordInput };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      setAuthMsg({ type: "success", text: isRegistering ? "Account created successfully!" : "Logged in successfully!" });
      setTimeout(() => {
        setShowAuthModal(false);
        setAuthMsg(null);
        checkUserSession();
        router.refresh();
      }, 700);
    } catch (err: any) {
      setAuthMsg({ type: "error", text: err.message || "Failed to authenticate." });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setShowProfileDropdown(false);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const navItems = [
    {
      name: "Dashboard",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      name: "Trip Map",
      icon: Compass,
      href: activeTripId ? `/planner/${activeTripId}` : "#",
      active: pathname.startsWith("/planner"),
      disabled: !activeTripId,
    },
    {
      name: "Budget",
      icon: Landmark,
      href: activeTripId ? `/budget/${activeTripId}` : "#",
      active: pathname.startsWith("/budget"),
      disabled: !activeTripId,
    },
  ];

  return (
    <>
      {/* RESPONSIVE LAYOUT CONTAINER */}
      <div className="fixed z-[100] 
        bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg
        md:bottom-auto md:top-0 md:left-0 md:translate-x-0 md:w-full md:max-w-none 
        transition-all duration-300">
        
        {/* INNER CONTAINER */}
        <nav className="flex items-center justify-between px-5 py-2.5 rounded-full glass-panel glass-panel-glow !overflow-visible border-gray-200/50 bg-[#FAF8F5]/80 shadow-xl backdrop-blur-xl
          md:rounded-none md:border-b md:border-slate-200/20 md:px-10 md:h-[84px] md:shadow-[0_4px_20px_rgba(0,0,0,0.03)] md:bg-white/80 md:backdrop-blur-[16px]">
          
          {/* LOGO SECTION - Left aligned on desktop */}
          <Link href="/" className="flex items-center gap-2.5 hover:-translate-y-0.5 transition-transform duration-200">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.15 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="flex items-center justify-center text-teal-600"
            >
              <Sparkles className="w-7 h-7" />
            </motion.div>
            <span className="hidden sm:inline-block font-display text-teal-950 font-extrabold text-xl md:text-[22px] tracking-tight">
              TripMitra
            </span>
          </Link>

          {/* MIDDLE NAVIGATION ITEMS */}
          <div className="flex items-center gap-1 md:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isClickable = !item.disabled;
              
              const content = (
                <motion.button
                  whileHover={isClickable ? { scale: 1.02, y: -2 } : {}}
                  whileTap={isClickable ? { scale: 0.98 } : {}}
                  className={`relative group flex items-center gap-2 px-3.5 py-3 md:py-2 rounded-full text-xs md:text-[15px] font-semibold tracking-wide transition-all duration-200 ${
                    item.active
                      ? "text-teal-950 font-bold"
                      : isClickable
                      ? "text-slate-700 hover:text-slate-950 hover:bg-slate-500/5"
                      : "text-slate-400 cursor-not-allowed"
                  }`}
                  disabled={item.disabled}
                  title={item.disabled ? "Select or create a trip to unlock" : ""}
                >
                  {item.active && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute inset-0 bg-teal-600/12 border border-teal-600/20 rounded-full shadow-[0_4px_12px_rgba(45,140,120,0.15)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${
                    item.active 
                      ? "text-teal-700" 
                      : isClickable 
                      ? "text-slate-500 group-hover:text-slate-900 group-hover:rotate-6" 
                      : "text-slate-300"
                  }`} />
                  <span className="hidden sm:inline relative z-10">{item.name}</span>
                </motion.button>
              );

              if (item.disabled) {
                return <div key={item.name}>{content}</div>;
              }

              return (
                <Link key={item.name} href={item.href}>
                  {content}
                </Link>
              );
            })}
          </div>

          {/* RIGHT AUTH & USER SECTION */}
          <div className="flex items-center gap-3.5 relative">
            
            {/* Merged Utility Pill [ 🔔 ] [ ⚙️ ] (Desktop only) */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100/90 border border-slate-200/50 p-1 rounded-full shadow-sm hover:shadow transition-shadow duration-200">
              {/* Notifications Bell */}
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotifications(!showNotifications);
                    setShowSettings(false);
                    setShowProfileDropdown(false);
                  }}
                  className={`p-2 rounded-full transition-all duration-200 relative hover:scale-105 active:scale-95 ${
                    showNotifications 
                      ? "bg-white text-teal-700 shadow-sm" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                  }`}
                  title="Notifications"
                >
                  <Bell className="w-[18px] h-[18px]" />
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
                  )}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <div className="hidden md:block">
                      {renderNotificationsPanel(false)}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Settings Shortcut */}
              <div className="relative" ref={settingsRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(!showSettings);
                    setShowNotifications(false);
                    setShowProfileDropdown(false);
                  }}
                  className={`p-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${
                    showSettings 
                      ? "bg-white text-teal-700 shadow-sm" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                  }`}
                  title="Workspace Settings"
                >
                  <Settings className="w-[18px] h-[18px] hover:rotate-45 transition-transform duration-300" />
                </button>
                <AnimatePresence>
                  {showSettings && (
                    <div className="hidden md:block">
                      {renderSettingsPanel(false)}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Profile Pill & CTA Area */}
            <div className="flex items-center gap-2.5">
              
              {/* Profile Dropdown Pill */}
              <div className="relative" ref={profileRef}>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileDropdown(!showProfileDropdown);
                    setShowNotifications(false);
                  }}
                  className="flex items-center gap-2 bg-slate-100/90 border border-slate-200/50 py-2 px-3 md:py-1 md:px-3 rounded-full hover:bg-slate-200/55 transition-all duration-200 cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
                >
                  {user ? (
                    <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-black">
                      G
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {user ? (user.name || user.email.split("@")[0]) : "Guest"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Profile Dropdown Menu */}
                <AnimatePresence>
                  {showProfileDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 bottom-full mb-3 md:bottom-auto md:top-full md:mt-3 w-52 rounded-2xl border border-gray-200 bg-[#FAF8F5]/95 backdrop-blur-md p-2 shadow-xl z-50 text-left flex flex-col"
                    >
                      <div className="px-3 py-2 border-b border-gray-150 mb-1">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Account (MongoDB)</p>
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {user ? user.email : "Guest Mode"}
                        </p>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={() => { setShowSettings(true); setShowProfileDropdown(false); }}
                        className="w-full text-left px-3 py-3 md:py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Settings
                      </button>

                      {/* Mobile-only menu items */}
                      <div className="md:hidden border-t border-gray-150 my-1 pt-1 space-y-0.5">
                        <button 
                          type="button"
                          onClick={() => {
                            setShowNotifications(true);
                            setShowProfileDropdown(false);
                          }}
                          className="w-full text-left px-3 py-3 md:py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 relative"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Notifications</span>
                          {notifications.some(n => !n.read) && (
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                          )}
                        </button>
                      </div>

                      {!user && (
                        <Link 
                          href="/login"
                          className="w-full text-left px-3 py-3 md:py-2 text-xs font-semibold text-teal-600 hover:bg-teal-500/5 rounded-lg transition-colors flex items-center gap-2 border-t border-gray-150 mt-1 pt-2"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          Sign In / Register
                        </Link>
                      )}

                      {user && (
                        <button 
                          type="button"
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-3 md:py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2 border-t border-gray-150 mt-1 pt-2"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mobile-only Notifications Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <div className="md:hidden">
                      {renderNotificationsPanel(true)}
                    </div>
                  )}
                </AnimatePresence>

                {/* Mobile-only Settings Dropdown */}
                <AnimatePresence>
                  {showSettings && (
                    <div className="md:hidden">
                      {renderSettingsPanel(true)}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Join Workspace CTA Button (shown if guest) */}
              {!user && (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white font-extrabold text-xs md:text-sm px-4.5 py-2 md:px-5 md:py-2.5 rounded-full shadow-[0_4px_12px_rgba(45,140,120,0.15)] hover:shadow-[0_12px_24px_rgba(45,140,120,0.25)] transition-all duration-200"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>

          </div>
        </nav>
      </div>

      {/* AUTH POPUP MODAL (Quick Modal for Sign In / Register) */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-2xl border border-gray-200 bg-[#FAF8F5] p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-extrabold font-display text-[#221F1C]">
                  {isRegistering ? "Create Account" : "Access Your Trips"}
                </h3>
                <button
                  onClick={() => {
                    setShowAuthModal(false);
                    setAuthMsg(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {isRegistering && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#666059] uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs focus:border-teal-500 outline-none text-slate-800"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-[#666059] uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder="wanderer@globe.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs focus:border-teal-500 outline-none text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#666059] uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs focus:border-teal-500 outline-none text-slate-800"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs py-2.5 rounded-xl transition-all duration-200 mt-2 cursor-pointer shadow-md"
                >
                  {loading ? "Processing..." : isRegistering ? "Sign Up" : "Sign In"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setAuthMsg(null);
                  }}
                  className="text-xs text-teal-650 hover:underline font-semibold"
                >
                  {isRegistering ? "Already have an account? Sign In" : "Need an account? Create one"}
                </button>
              </div>

              {authMsg && (
                <div
                  className={`mt-4 p-3 rounded-xl border text-xs leading-relaxed ${
                    authMsg.type === "success"
                      ? "bg-green-500/10 border-green-500/20 text-green-800 flex items-center gap-1.5"
                      : "bg-red-500/10 border-red-500/20 text-red-800"
                  }`}
                >
                  {authMsg.type === "success" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {authMsg.text}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
