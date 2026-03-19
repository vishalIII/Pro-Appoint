import { useParams } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { useAuth } from "../auth/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function MeetingPage() {
  const { token } = useAuth();
  const { appointmentId } = useParams();
  const containerRef = useRef(null);
  const zpRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const sendLeave = async () => {
      try {
        if (!token || !appointmentId) return;
        await fetch(`${API_BASE_URL}/meeting/leave/${appointmentId}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // ignore cleanup errors
      }
    };

    const handleUnload = () => {
      zpRef.current?.destroy();
      sendLeave();
    };

    const startMeeting = async () => {
      if (!containerRef.current) return;

      try {
        setError("");
        setLoading(true);

        const res = await fetch(
          `${API_BASE_URL}/meeting/token/${appointmentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Failed to fetch meeting token");
        }

        const zp = ZegoUIKitPrebuilt.create(data.token);
        zpRef.current = zp;

        if (!mounted) return;

        zp.joinRoom({
          container: containerRef.current,
          userID: data.userId,
          userName: data.userName,
          scenario: {
            mode: ZegoUIKitPrebuilt.GroupCall,
          },
        });

        // handle tab/browser close
        window.addEventListener("beforeunload", handleUnload);

      } catch (err) {
        console.error("Meeting start failed:", err);
        if (mounted) {
          setError(err.message || "Unable to join meeting");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (token) {
      startMeeting();
    }

    return () => {
      mounted = false;

      // cleanup on component unmount
      zpRef.current?.destroy();
      sendLeave();

      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [appointmentId, token]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "var(--bg)",
        padding: "24px",
      }}
    >
      {error ? (
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            padding: "20px",
            borderRadius: "12px",
            background: "#fff7f7",
            color: "#b42318",
            boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
            textAlign: "center",
          }}
        >
          <h3 style={{ marginBottom: 8 }}>Unable to join meeting</h3>
          <p style={{ marginBottom: 16 }}>{error}</p>
          <p style={{ fontSize: 14, color: "#5f5f5f" }}>
            If the meeting has not started yet, please try again closer to the scheduled time.
          </p>
        </div>
      ) : (
        <div
          // className="meeting-theme"
          ref={containerRef}
          style={{
            width: "80%",
            height: "80vh",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            background: loading ? "#f7f7f7" : "transparent",
          }}
        />
      )}
    </div>
  );
}
