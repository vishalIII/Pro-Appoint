import { useParams } from "react-router-dom";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ZEGO_APP_ID = Number(import.meta.env.VITE_ZEGO_APP_ID);
const ZEGO_SERVER_SECRET = import.meta.env.VITE_ZEGO_SERVER_SECRET;

export default function MeetingPage() {
  const { appointmentId } = useParams();

  const startMeeting = async (element) => {
    if (!element) return;

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

      zp.joinRoom({
        container: element,
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
      });

    } catch (err) {
      console.error("Meeting start failed:", err);
    }
  };

  return (
    <div
      ref={startMeeting}
      style={{ width: "100%", height: "100vh" }}
    />
  );
}