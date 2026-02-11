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
    contactNumber: "",
    vehicleNumber: "",
    vehicleType: "Motorbike",
  });

  const vehicleOptions = ["Motorbike", "Tricycle", "Van", "Car", "Bicycle", "Other"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const { name, email, password, contactNumber, vehicleNumber, vehicleType } = form;
    if (!name || !email || !password || !contactNumber || !vehicleNumber || !vehicleType) {
      alert("Please fill in all fields!");
      return;
    }

    const payload = {
      fullName: name,
      email,
      password,
      contactNumber,
      vehicleNumber,
      vehicleType,
    };

    console.log("DEBUG: createDriver payload ->", payload);

    const res = await dispatch(createDriverAccount(payload));
    console.log("DEBUG: createDriver result ->", res);

    if (res?.payload?.success) {
      alert("✅ Driver created successfully!");
      setForm({
        name: "",
        email: "",
        password: "",
        contactNumber: "",
        vehicleNumber: "",
        vehicleType: "Motorbike",
      });
    } else {
      const msg = res?.payload || res?.error?.message || "Failed to create driver account.";
      alert(`❌ ${msg}`);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-sm bg-white">
      <h2 className="text-2xl font-bold mb-4">Add Driver Account</h2>
      <div className="space-y-3">
        <Input type="text" name="name" placeholder="Driver Full Name" value={form.name} onChange={handleChange} />
        <Input type="email" name="email" placeholder="Driver Email" value={form.email} onChange={handleChange} />
        <Input type="password" name="password" placeholder="Driver Password" value={form.password} onChange={handleChange} />
        <Input type="text" name="contactNumber" placeholder="Contact Number" value={form.contactNumber} onChange={handleChange} />
        <Input type="text" name="vehicleNumber" placeholder="Vehicle Number" value={form.vehicleNumber} onChange={handleChange} />

        <label className="block text-sm font-medium">Vehicle Type</label>
        <select name="vehicleType" value={form.vehicleType} onChange={handleChange} className="w-full border rounded p-2">
          {vehicleOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <Button onClick={handleSubmit} className="w-full">
          Create Driver
        </Button>
      </div>
    </div>
  );
}

export default AddDriver;
