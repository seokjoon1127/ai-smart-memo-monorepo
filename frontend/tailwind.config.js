/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        toss: {
          blue: "#3182F6",
          "blue-hover": "#1B64DA",
          "blue-light": "#E8F3FF",
          "blue-50": "#F4F9FF",
          gray: {
            900: "#191F28",
            700: "#333D4B",
            600: "#4E5968",
            500: "#6B7684",
            400: "#8B95A1",
            300: "#B0B8C1",
            200: "#D1D6DB",
            100: "#E5E8EB",
            50: "#F2F4F6",
            25: "#F9FAFB",
          },
          warning: "#FF9500",
          "warning-bg": "#FFF7ED",
          success: "#10B981",
          "success-bg": "#E6F4EA",
          purple: "#8B5CF6",
          "purple-bg": "#F4F0FF",
        },
      },
      fontFamily: {
        pretendard: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
