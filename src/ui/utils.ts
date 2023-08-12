import { useEffect, useState } from "react";

/**
 * React hook, similar to useState, that persists the state to local storage.
 */
export function useLocalStorage<T>(
    key: string,
    deserialize: (s: string | undefined) => T,
    serialize: (x: T) => string,
): [T, (x: T) => void] {
    const [value, setValue] = useState(() => deserialize(localStorage.getItem(key) ?? undefined));

    return [
        value,
        newValue => {
            localStorage.setItem(key, serialize(newValue));
            setValue(newValue);
        },
    ];
}

/**
 * React hook that returns the browser window size. Resize events are debounced by 100 ms.
 */
export function useWindowSize() {
    const [windowSize, setWindowSize] = useState(getWindowSize);

    useEffect(() => {
        const onResize = debounce(() => setWindowSize(getWindowSize()), 100);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    return windowSize;
}

function getWindowSize() {
    return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Create a debounced function thet delays invoking callback until dealyMs has elapsed since the
 * last time the debounced function was invoked.
 */
function debounce(callback: () => void, delayMs: number) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = undefined;
            callback();
        }, delayMs);
    };
}
