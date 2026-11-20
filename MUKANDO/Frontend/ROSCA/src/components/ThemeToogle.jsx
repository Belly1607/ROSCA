
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import "../page_css/Theme.css";

const KEY = "ubc-rosca-theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(KEY) || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-ubc-theme",
      theme
    );

    document.documentElement.style.colorScheme = theme;

    localStorage.setItem(KEY, theme);
  }, [theme]);

  function changeTheme() {
    setTheme((current) =>
      current === "light" ? "dark" : "light"
    );
  }

  return (
    <button
      type="button"
      className="ubc-theme-toggle"
      onClick={changeTheme}
      title={
        theme === "light"
          ? "Switch to Dark Mode"
          : "Switch to Light Mode"
      }
      aria-label={
        theme === "light"
          ? "Switch to Dark Mode"
          : "Switch to Light Mode"
      }
    >
      {theme === "light"
        ? <Moon size={21} />
        : <Sun size={21} />}
    </button>
  );
}
