import React, { useState, useEffect, useRef } from "react";
import { AlignJustify, LogOut, X } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logoutUser } from "@/store/auth-slice";

function AdminHeader({ setOpen }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showModal, setShowModal] = useState(false);

  // ============================
  // ADMIN PROFILE HANDLING
  // ============================
  const [admin, setAdmin] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 👉 Load admin info from localStorage or token
  useEffect(() => {
    // Try several keys (you may use different storage)
    const keys = ["admin", "user", "currentUser"];

    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const obj = JSON.parse(raw);
          if (obj?.name || obj?.fullName || obj?.email) {
            setAdmin(obj);
            return;
          }
        } catch {}
      }
    }

    // Fallback → decode admin name from JWT token
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payloadPart = token.split(".")[1];
        if (payloadPart) {
          const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
          const padded =
            base64 + "=".repeat((4 - (base64.length % 4)) % 4);
          const json = atob(padded);
          const payload = JSON.parse(json);

          const name =
            payload.name ||
            payload.fullName ||
            payload.email ||
            (payload.user && (payload.user.name || payload.user.fullName));

          setAdmin({
            name: name || "Admin",
            role: payload.role || "admin",
            _rawPayload: payload,
          });
        }
      } catch (err) {
        console.log("JWT decode failed", err);
      }
    }
  }, []);

  // 👉 Close dropdown on outside click
  useEffect(() => {
    function close(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // 🧩 Unified display name
  const displayName =
    admin?.name ||
    admin?.fullName ||
    admin?.email ||
    admin?._rawPayload?.name ||
    admin?._rawPayload?.fullName ||
    admin?._rawPayload?.email ||
    "Admin";

  // ============================
  // LOGOUT LOGIC
  // ============================
  const handleLogout = () => setShowModal(true);

  const confirmLogout = async () => {
    setShowModal(false);
    try {
      await dispatch(logoutUser()).unwrap();
      localStorage.removeItem("token");
      localStorage.removeItem("admin");
      localStorage.removeItem("user");
      window.location.href = "/auth/login"; // full redirect
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Try again.");
    }
  };

  const cancelLogout = () => setShowModal(false);

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-background border-b">
      
      <Button onClick={() => setOpen(true)} className="lg:hidden sm:block">
        <AlignJustify />
      </Button>

      <div className="flex flex-1 justify-end items-center gap-4" ref={dropdownRef}>
        
        {/* ============================
            IF NOT LOGGED IN → Show Login
           ============================ */}
        {!admin ? (
          <a
            href="/auth/login"
            className="bg-primary px-4 py-2 rounded-md text-white font-medium"
          >
            Login
          </a>
        ) : (
          <>
            {/* ============================
                PROFILE BUTTON
               ============================ */}
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-3 px-3 py-1 border rounded-md bg-white shadow-sm hover:bg-gray-50"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">{displayName}</div>
                <div className="text-xs text-gray-500">Admin</div>
              </div>
            </button>

            {/* ============================
                DROPDOWN MENU
               ============================ */}
            {dropdownOpen && (
              <div className="absolute right-4 top-16 bg-white border rounded-lg shadow-md w-40 z-50">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center px-3 py-2 hover:bg-gray-100 text-sm"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ============================
          LOGOUT CONFIRMATION MODAL
         ============================ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="rounded-2xl p-6 w-80 text-center relative bg-white/10 backdrop-blur-xl border border-white/30 text-white shadow-lg">

            <button
              className="absolute top-3 right-3 text-white/70 hover:text-white"
              onClick={cancelLogout}
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-semibold mb-3">Confirm Logout</h2>
            <p className="text-sm text-white/80 mb-6">
              Are you sure you want to log out?
            </p>

            <div className="flex justify-center gap-3">
              <Button
                onClick={cancelLogout}
                className="bg-white/20 text-white hover:bg-white/30 rounded-md h-10 px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmLogout}
                className="bg-red-500/80 hover:bg-red-500 text-white rounded-md h-10 px-4 py-2"
              >
                Yes, Logout
              </Button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}

export default AdminHeader;
