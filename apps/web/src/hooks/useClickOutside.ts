import React from "react";

/**
 * Hook that detects clicks outside of a specified element and triggers a callback.
 *
 * @param ref - A React ref object pointing to the HTML element to monitor
 * @param onClickOutside - Callback function to execute when a click occurs outside the referenced element
 * @param enabled - Optional flag to enable or disable the hook (defaults to true)
 *
 */
export const useClickOutside = (
  ref: React.RefObject<HTMLElement | null>,
  onClickOutside: () => void,
  enabled = true,
) => {
  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside();
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClickOutside, enabled]);
};
