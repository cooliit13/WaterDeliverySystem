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
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      alert("Please fill in all fields!");
      return;
    }

    const res = await dispatch(createDriverAccount(form));
    if (res?.payload?.success) {
      alert("✅ Driver account created!");
      setForm({ name: "", email: "", password: "" });
    } else {
      alert("❌ Failed to create driver account!");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-sm">
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
        <Button onClick={handleSubmit} className="w-full">
          Create Driver
        </Button>
      </div>
    </div>
  );
}

export default AddDriver;
