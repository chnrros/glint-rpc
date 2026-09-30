import { useEffect } from "react";
import { usePersistedState } from "./usePersistedState";

export type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = usePersistedState<Theme>("theme", "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return { theme, setTheme };
}
