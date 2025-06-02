import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // Ensure this code only runs on the client
    if (typeof window === "undefined") {
      return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const updateIsMobileStatus = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Set the initial status
    updateIsMobileStatus();

    // Add event listener for changes
    mql.addEventListener("change", updateIsMobileStatus);

    // Clean up event listener on unmount
    return () => {
      mql.removeEventListener("change", updateIsMobileStatus);
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount (client-side)

  return !!isMobile;
}
