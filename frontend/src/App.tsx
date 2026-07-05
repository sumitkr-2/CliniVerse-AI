import { AuthProvider } from "./context/AuthContext";
import { PrivateRoute } from "./components/PrivateRoute";
import { AuthScreen } from "./pages/AuthScreen";
import { Dashboard } from "./pages/Dashboard";

export default function App() {
  return (
    <AuthProvider>
      <PrivateRoute fallback={<AuthScreen />}>
        <Dashboard />
      </PrivateRoute>
    </AuthProvider>
  );
}
