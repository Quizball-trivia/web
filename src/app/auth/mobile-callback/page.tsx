"use client";

import { useEffect, useState } from "react";

export default function MobileCallbackPage() {
  const [status, setStatus] = useState("Redirecting to QuizBall...");

  useEffect(() => {
    const hash = window.location.hash || "";
    const query = window.location.search || "";

    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(query.replace(/^\?/, ""));

    const accessToken =
      hashParams.get("access_token") || queryParams.get("access_token");
    const refreshToken =
      hashParams.get("refresh_token") || queryParams.get("refresh_token");

    if (accessToken && refreshToken) {
      const tokenParams = `access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;

      // Try custom scheme first (production builds)
      window.location.href = `quizball://auth/callback?${tokenParams}`;

      // Fallback to Expo Go scheme after short delay
      setTimeout(() => {
        window.location.href = `exp://192.168.100.9:8081/--/auth/callback?${tokenParams}`;
      }, 500);

      setTimeout(() => {
        setStatus("If the app didn't open, switch back to QuizBall manually.");
      }, 2000);
    } else {
      setStatus("No authentication tokens found. Please try again.");
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#071013",
        color: "#fff",
        fontFamily: "sans-serif",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <p>{status}</p>
    </div>
  );
}
