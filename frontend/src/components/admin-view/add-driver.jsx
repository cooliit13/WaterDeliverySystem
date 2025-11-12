import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDispatch } from "react-redux";
import { createDriverAccount } from "@/store/driver-slice";

function AddDriver() {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    contactNumber: "",       // ✅ added
    vehicleNumber: "",       // ✅ added
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const { name, email, password, contactNumber, vehicleNumber } = form;
    if (!name || !email || !password || !contactNumber || !vehicleNumber) {
      alert("Please fill in all fields!");
      return;
    }

    const res = await dispatch(createDriverAccount(form));
    if (res?.payload?.success) {
      alert("✅ Driver created successfully!");
      setForm({
        name: "",
        email: "",
        password: "",
        contactNumber: "",
        vehicleNumber: "",
      });
    } else {
      alert("❌ Failed to create driver account.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-sm bg-white">
      <h2 className="text-2xl font-bold mb-4">Add Driver Account</h2>
      <div className="space-y-4">
        <Input
          type="text"
          name="name"
          placeholder="Driver Name"
          value={form.name}
          onChange={handleChange}
        />
        <Input
          type="email"
          name="email"
          placeholder="Driver Email"
          value={form.email}
          onChange={handleChange}
        />
        <Input
          type="password"
          name="password"
          placeholder="Driver Password"
          value={form.password}
          onChange={handleChange}
        />
        <Input
          type="text"
          name="contactNumber"
          placeholder="Contact Number"
          value={form.contactNumber}
          onChange={handleChange}
        />
        <Input
          type="text"
          name="vehicleNumber"
          placeholder="Vehicle Number"
          value={form.vehicleNumber}
          onChange={handleChange}
        />
        <Button onClick={handleSubmit} className="w-full">
          Create Driver
        </Button>
      </div>
    </div>
  );
}

export default AddDriver;