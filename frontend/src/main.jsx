import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store/store.js";
import { Toaster } from "./components/ui/toaster.jsx";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { GoogleOAuthProvider } from "@react-oauth/google"; // ✅ Added this

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Provider store={store}>
      <GoogleOAuthProvider clientId="610350229033-h9p7ghov8v16u2ee7l8apqvejjr7vm29.apps.googleusercontent.com"> {/* ✅ Added this wrapper */}
        <GoogleReCaptchaProvider
          reCaptchaKey="6LfW4vErAAAAAD3dXqo-wXcjTIPssmzx51G3XvD_"
          scriptProps={{ async: true, defer: true }}
        >
          <App />
          <Toaster />
        </GoogleReCaptchaProvider>
      </GoogleOAuthProvider>
    </Provider>
  </BrowserRouter>
);