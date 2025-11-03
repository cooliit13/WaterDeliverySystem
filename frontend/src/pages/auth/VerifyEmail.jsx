import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("Verifying your email...");

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/auth/verify/${token}`);
        if (res.status === 200) {
          setStatus("✅ Email verified successfully! You can now log in.");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("❌ Verification failed. The link may be invalid or expired.");
      }
    };
    verify();
  }, [token]);

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>{status}</h2>
    </div>
  );
}
