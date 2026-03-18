import { useParams, useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ZEGO_APP_ID = Number(import.meta.env.VITE_ZEGO_APP_ID);
const ZEGO_SERVER_SECRET = import.meta.env.VITE_ZEGO_SERVER_SECRET;

export default function MeetingPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const containerRef = useRef(null);
  const zpRef = useRef(null);

  const [endTime, setEndTime] = useState(null);
  const [error, setError] = useState(null);

  // 🔥 HANDLE ERRORS CLEANLY
  const handleJoinError = (message) => {
    setError(message || "Unable to join meeting");

    // auto redirect after 2 sec
    setTimeout(() => {
      navigate(-1); // or navigate(-1)
    }, 2000);
  };

  useEffect(() => {
    let mounted = true;

    const handleUnload = () => {
      zpRef.current?.destroy();
    };

    const startMeeting = async () => {
      if (!containerRef.current) return;

      try {
        const res = await fetch(
          `${API_BASE_URL}/video/join/${appointmentId}`,
          { credentials: "include" }
        );

        const data = await res.json();

        console.log("JOIN RESPONSE:", data);

        // ❌ API ERROR
        if (!res.ok) {
          handleJoinError(data.message);
          return;
        }

        // ❌ INVALID DATA
        if (!data.startTime || !data.endTime) {
          handleJoinError("Invalid meeting time data");
          return;
        }

        const start = new Date(data.startTime);
        const end = new Date(data.endTime);
        const now = new Date();

        const windowStart = new Date(start.getTime() - 10 * 60 * 1000);

        // 🔒 TOO EARLY
        if (now < windowStart) {
          handleJoinError("You can join only 10 minutes before the session starts");
          return;
        }

        // 🔒 TOO LATE
        if (now > end) {
          handleJoinError("Meeting has already ended");
          return;
        }

        // ✅ STORE endTime for auto-exit
        setEndTime(data.endTime);

        // ✅ GENERATE TOKEN
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          ZEGO_APP_ID,
          ZEGO_SERVER_SECRET,
          data.roomId,
          data.userId,
          data.userName
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        if (!mounted) return;

        zp.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.GroupCall,
          },
        });

        window.addEventListener("beforeunload", handleUnload);

      } catch (err) {
        console.error("Meeting start failed:", err);
        handleJoinError("Something went wrong while joining meeting");
      }
    };

    startMeeting();

    return () => {
      mounted = false;
      zpRef.current?.destroy();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [appointmentId]);

  // 🔥 AUTO END MEETING
  useEffect(() => {
    if (!endTime || !zpRef.current) return;

    const now = new Date();
    const end = new Date(endTime);

    const timeLeft = end.getTime() - now.getTime();

    if (timeLeft <= 0) {
      zpRef.current?.destroy();

      //  show message FIRST (async to avoid warning)
      setTimeout(() => {
        setError("Session already ended");
      }, 0);

      //  then redirect
      setTimeout(() => {
        navigate(-1, { replace: true });
      }, 1500);

      return;
    }

    const timer = setTimeout(() => {
      zpRef.current?.destroy();
      handleJoinError("Session ended");
    }, timeLeft);

    return () => clearTimeout(timer);
  }, [endTime]);

  // 🔥 ERROR UI (NO ALERTS)
  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "var(--bg)",
        }}
      >
        <h2 style={{ color: "red", marginBottom: "10px" }}>{error}</h2>
        <p>Redirecting...</p>
      </div>
    );
  }

  // 🔥 NORMAL MEETING UI
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "var(--bg)",
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: "80%",
          height: "80vh",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}