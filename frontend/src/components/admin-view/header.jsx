import React, { useState } from "react";
import { AlignJustify, LogOut, X } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logoutUser } from "@/store/auth-slice";

function AdminHeader({ setOpen }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);

  const handleLogout = () => {
    setShowModal(true);
  };

  const confirmLogout = async () => {
    setShowModal(false);
    try {
      await dispatch(logoutUser()).unwrap();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth/login"; // ✅ Full redirect
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Try again.");
    }
  };

  const cancelLogout = () => {
    setShowModal(false);
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-background border-b">
      <Button onClick={() => setOpen(true)} className="lg:hidden sm:block">
        <AlignJustify />
        <span className="sr-only">Toggle Menu</span>
      </Button>
      <div className="flex flex-1 justify-end">
        <Button
          onClick={handleLogout}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background 
          transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
          disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Logout Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div
            className="rounded-2xl p-6 w-80 text-center relative 
            bg-white/10 backdrop-blur-xl border border-white/30 
            shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] text-white"
          >
            <button
              className="absolute top-3 right-3 text-white/70 hover:text-white"
              onClick={cancelLogout}
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-semibold mb-3 text-white">
              Confirm Logout
            </h2>
            <p className="text-sm text-white/80 mb-6">
              Are you sure you want to log out?
            </p>

            <div className="flex justify-center gap-3">
              <Button
                onClick={cancelLogout}
                className="bg-white/20 text-white hover:bg-white/30 
                rounded-md h-10 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmLogout}
                className="bg-red-500/80 hover:bg-red-500 text-white 
                rounded-md h-10 px-4 py-2 text-sm font-medium"
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