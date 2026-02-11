import axios from "axios";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function AdminBackupButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/admin/backup/export", {
        headers: { ...authHeaders() },
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date().toISOString().replace(/[:.]/g, "-");
      a.download = `admin-backup-${now}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: "Backup downloaded" });
    } catch (err) {
      console.error("Backup download failed:", err);
      toast({ title: "Backup failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={loading}>
      {loading ? "Preparing backup…" : "Download Backup (JSON)"}
    </Button>
  );
}
