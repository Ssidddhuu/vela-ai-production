import { useEffect } from "react";
import { useAuth } from "./store/auth";
import AuthScreen from "./components/AuthScreen";
import ChatScreen from "./components/ChatScreen";

export default function App() {
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const init = useAuth((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-ink/50">Starting up…</div>;
  }

  return user ? <ChatScreen /> : <AuthScreen />;
}
