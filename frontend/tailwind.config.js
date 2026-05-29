/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      colors: {
        gold: "#F5A623",
        "gold-dim": "#D4891A",
        "gold-muted": "rgba(245,166,35,0.15)",

        "bg-base": "#0A0A0F",
        "bg-surface": "#111118",
        "bg-elevated": "#1A1A24",

        "text-primary": "#F0F0F5",
        "text-secondary": "#C8C8D8",
        "text-muted": "#8B8BA7",
        "text-disabled": "#4A4A5C",

        "border-subtle": "rgba(255,255,255,0.08)",
        "border-medium": "rgba(255,255,255,0.12)",
        "border-gold": "rgba(245,166,35,0.35)",

        "kili-red": "#FF2D2D",
        "kili-green": "#10B981",
        "kili-blue": "#3B82F6",
        "kili-purple": "#8B5CF6",
        "kili-orange": "#F97316",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },

      animation: {
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "pulse-red": "pulse-red 1.5s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        "scale-in": "scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        "bounce-dot": "bounce-dot 1.2s ease-in-out infinite",
      },

      keyframes: {
        "pulse-gold": {
          "0%,100%": {
            boxShadow: "0 0 0 0 rgba(245,166,35,0.4)",
          },
          "50%": {
            boxShadow: "0 0 0 16px rgba(245,166,35,0)",
          },
        },

        "pulse-red": {
          "0%,100%": {
            boxShadow: "0 0 0 0 rgba(255,45,45,0.5)",
          },
          "50%": {
            boxShadow: "0 0 0 20px rgba(255,45,45,0)",
          },
        },

        float: {
          "0%,100%": {
            transform: "translateY(0)",
          },
          "50%": {
            transform: "translateY(-8px)",
          },
        },

        shimmer: {
          "0%": {
            backgroundPosition: "-800px 0",
          },
          "100%": {
            backgroundPosition: "800px 0",
          },
        },

        "fade-in": {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },

        "slide-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },

        "scale-in": {
          "0%": {
            opacity: "0",
            transform: "scale(0.9)",
          },
          "100%": {
            opacity: "1",
            transform: "scale(1)",
          },
        },

        "bounce-dot": {
          "0%,80%,100%": {
            transform: "translateY(0)",
          },
          "40%": {
            transform: "translateY(-8px)",
          },
        },
      },

      boxShadow: {
        gold: "0 0 20px rgba(245,166,35,0.35)",
        "gold-lg": "0 0 40px rgba(245,166,35,0.45)",
        red: "0 0 20px rgba(255,45,45,0.35)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
        modal: "0 25px 50px rgba(0,0,0,0.7)",
      },

      backgroundImage: {
        "gradient-gold":
          "linear-gradient(135deg, #F5A623, #E8892A)",

        "gradient-gold-subtle":
          "linear-gradient(135deg, rgba(245,166,35,0.12), rgba(232,137,42,0.04))",

        "gradient-card":
          "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 40%, transparent 70%)",

        "gradient-hero":
          "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 40%)",
      },

      height: {
        dvh: "100dvh",
        "13": "3.25rem",
        "18": "4.5rem",
      },

      minHeight: {
        dvh: "100dvh",
      },
    },
  },

  plugins: [],
};