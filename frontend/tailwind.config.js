/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#0F1724",
        teal: "#0ABAB5",
        coral: "#FF6B61",
        sand: "#F6EFE8",
        surface: "#F6EFE8",
      },
      borderRadius: {
        xl: "12px",
      },
      spacing: {
        4: "16px",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};
