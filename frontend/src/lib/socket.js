import { io } from "socket.io-client";

// inside your component's useEffect:
useEffect(() => {
  if (!user?.id) return;

  // Vite env var (make sure you created VITE_SOCKET_URL in .env)
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

  const socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    socket.emit("identify", user.id); // identify the socket to the backend
  });

  const onOrderStatusUpdate = (payload) => {
    // show toast and optionally navigate
    toast((t) => (
      <div className="p-2">
        <div className="font-semibold">Order Update</div>
        <div className="text-sm">
          Order #{payload.orderId} is now <strong>{payload.status}</strong>
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              toast.dismiss(t.id);
              navigate(`/shop/orders/${payload.orderId}`);
            }}
          >
            View order
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.dismiss(t.id)}>
            Dismiss
          </Button>
        </div>
      </div>
    ), { duration: 8000, position: "top-right" });
  };

  socket.on("order:status:update", onOrderStatusUpdate);

  socket.on("connect_error", (err) => {
    // eslint-disable-next-line no-console
    console.warn("Socket connect error:", err);
  });

  return () => {
    socket.off("order:status:update", onOrderStatusUpdate);
    try { socket.disconnect(); } catch (e) { /* ignore */ }
  };
}, [user?.id, dispatch, navigate]);
