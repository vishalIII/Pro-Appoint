import { useParams } from "react-router-dom";
import { useRef, useEffect } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ZEGO_APP_ID = Number(import.meta.env.VITE_ZEGO_APP_ID);
const ZEGO_SERVER_SECRET = import.meta.env.VITE_ZEGO_SERVER_SECRET;

export default function MeetingPage() {
  const { appointmentId } = useParams();
  const containerRef = useRef(null);
  const zpRef = useRef(null);

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

        // handle tab/browser close
        window.addEventListener("beforeunload", handleUnload);

      } catch (err) {
        console.error("Meeting start failed:", err);
      }
    };

    startMeeting();

    return () => {
      mounted = false;

      // cleanup on component unmount
      zpRef.current?.destroy();

      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [appointmentId]);

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
        // className="meeting-theme"
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