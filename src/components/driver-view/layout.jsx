import { Outlet } from "react-router-dom";

const DriverLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">Driver Dashboard</h1>
      </header>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default DriverLayout;
