import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type AccessMode = "operator" | "user";

const KEY = "gp-access-mode";

function getStoredMode(): AccessMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "operator" || v === "user") return v;
  } catch { /* SSR */ }
  return "operator";
}

interface ModeCtx {
  mode: AccessMode;
  setMode: (m: AccessMode) => void;
}

const ModeContext = createContext<ModeCtx>({
  mode: "operator",
  setMode: () => {},
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AccessMode>(getStoredMode);

  const setMode = useCallback((m: AccessMode) => {
    setModeState(m);
    try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
  }, []);

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
