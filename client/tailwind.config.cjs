/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bull: {
          green: "#1A3A2A",
          gold: "#B08D57",
          cream: "#FAF7F0",
          ink: "#1F1F1F"
        }
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px"
      },
      boxShadow: {
        card: "0 6px 24px rgba(0,0,0,0.08)",
        hover: "0 10px 28px rgba(0,0,0,0.12)"
      }
    },
  },
  plugins: [],
}
