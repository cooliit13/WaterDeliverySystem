import CommonForm from "@/components/common/form";
import { useToast } from "@/components/ui/use-toast";
import { loginFormControls } from "@/config";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const initialState = {
  email: "",
  password: "",
};

function AuthLogin() {
  const [formData, setFormData] = useState(initialState);
  const { toast } = useToast();
  const navigate = useNavigate();

  function onSubmit(event) {
    event.preventDefault();

    const { email, password } = formData;

    if (!email || !password) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // ✅ Frontend-only login simulation
    if (email === "reys10801@gmail.com") {
      toast({
        title: "Welcome Admin!",
        description: "Redirecting to Admin Dashboard...",
      });
      navigate("/admin/dashboard"); // 🔁 Redirect to Admin
    } 
    else if (email === "2301113504@Student.buksu.edu.ph") {
      toast({
        title: "Welcome Student!",
        description: "Redirecting to Shopping Home...",
      });
      navigate("/shop/home"); // 🔁 Redirect to Shop
    } 
    else {
      toast({
        title: "Login successful!",
        description: `Welcome back, ${email}! Redirecting to Shop...`,
      });
      navigate("/shop/home"); // Default redirect
    }

    console.log("Login form submitted:", formData);
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Sign in to your account
        </h1>
        <p className="mt-2">
          Don't have an account?
          <Link
            className="font-medium ml-2 text-primary hover:underline"
            to="/auth/register"
          >
            Register
          </Link>
        </p>
      </div>

      <CommonForm
        formControls={loginFormControls}
        buttonText="Sign In"
        formData={formData}
        setFormData={setFormData}
        onSubmit={onSubmit}
      />
    </div>
  );
}

export default AuthLogin;
