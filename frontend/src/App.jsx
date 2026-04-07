import { Suspense } from "react";
import AppRoutes from "./routes/AppRoutes";
import NotificationListener from "./components/NotificationListener";
import { NotificationProvider } from "./notifications/NotificationProvider";
import LoadingScreen from "./components/LoadingScreen";

function App() {
  return (
    <NotificationProvider>
      <NotificationListener />
      <Suspense fallback={<LoadingScreen />}>
        <AppRoutes />
      </Suspense>
    </NotificationProvider>
  );
}

export default App;
