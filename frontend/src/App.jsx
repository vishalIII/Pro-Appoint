import AppRoutes from "./routes/AppRoutes";
import NotificationListener from "./components/NotificationListener";
import { NotificationProvider } from "./notifications/NotificationProvider";

function App() {
  return (
    <NotificationProvider>
      <NotificationListener />
      <AppRoutes />
    </NotificationProvider>
  );
}

export default App;
