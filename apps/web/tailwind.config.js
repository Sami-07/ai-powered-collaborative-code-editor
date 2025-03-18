/** @type {import('tailwindcss').Config} */
export default {
    theme: {
      extend: {
        animation: {
          grid: "grid 15s linear infinite",
        },
        keyframes: {
          grid: {
            "0%": { transform: "translateY(-50%)" },
            "100%": { transform: "translateY(0)" },
          },
        },
      },
    },
    plugins: [
      // Using dynamic import for ESM compatibility
      await import("tailwindcss-animate")
    ],
  };