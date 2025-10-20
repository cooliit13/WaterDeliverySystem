import { Outlet } from "react-router-dom";
import AdminSideBar from "./sidebar";
import AdminHeader from "./header";
import { useState } from "react";
import waterBg from "@/assets/pictures/banners/water.jpg"; // ✅ Import your image

function AdminLayout() {
  const [openSidebar, setOpenSidebar] = useState(false);

  return (
    <div
      className="flex min-h-screen w-full bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url(${waterBg})`,
      }}
    >
      <div className="flex min-h-screen w-full relative z-10">
        {/* 🧭 Sidebar */}
        <AdminSideBar open={openSidebar} setOpen={setOpenSidebar} />

        {/* 🧩 Main Content */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <AdminHeader setOpen={setOpenSidebar} />

          {/* Glass effect container */}
          <main
            className="flex-1 flex flex-col p-4 md:p-6 m-4 rounded-2xl backdrop-blur-xl bg-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/30"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
