import { useEffect, useState } from "react";

/** True when viewport is below Tailwind `md` (768px). */
export function useIsNarrowViewport(): boolean {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isNarrow;
}
