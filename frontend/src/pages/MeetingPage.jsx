import { useParams } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ZEGO_APP_ID = Number(import.meta.env.VITE_ZEGO_APP_ID);
const ZEGO_SERVER_SECRET = import.meta.env.VITE_ZEGO_SERVER_SECRET;

export default function MeetingPage() {
  const { appointmentId } = useParams();
  const containerRef = useRef(null);
  const zpRef = useRef(null);

  const [endTime, setEndTime] = useState(null);

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

        if (!res.ok) {
          alert(data.message);
          return;
        }

        // ✅ Ensure backend sent required data
        if (!data.startTime || !data.endTime) {
          alert("Invalid meeting time data");
          return;
        }

        const start = new Date(data.startTime);
        const end = new Date(data.endTime);
        const now = new Date();

        const windowStart = new Date(start.getTime() - 10 * 60 * 1000);

        // 🔒 Block early join
        if (now < windowStart) {
          alert("You can join only 10 minutes before the session starts");
          return;
        }

        // 🔒 Block late join
        if (now > end) {
          alert("Meeting has already ended");
          return;
        }

        // ✅ Store endTime for auto-exit
        setEndTime(data.endTime);

        // ✅ Generate token AFTER validation
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
      }
    };

    startMeeting();

    return () => {
      mounted = false;
      zpRef.current?.destroy();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [appointmentId]);

  // ✅ AUTO END LOGIC
  useEffect(() => {
    if (!endTime || !zpRef.current) return;

    const now = new Date();
    const end = new Date(endTime);

    const timeLeft = end.getTime() - now.getTime();

    if (timeLeft <= 0) {
      zpRef.current?.destroy();
      alert("Session already ended");
      return;
    }

    const timer = setTimeout(() => {
      zpRef.current?.destroy();
      alert("Session ended");
    }, timeLeft);

    return () => clearTimeout(timer);
  }, [endTime]);

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