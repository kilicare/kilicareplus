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
        
        // Premium accent colors for landing page
        "accent-emerald": "#10B981",
        "accent-emerald-light": "#A7F3D0",
        "accent-coral": "#F97316",
        "accent-sky": "#0EA5E9",
        "accent-purple": "#A855F7",
        "accent-rose": "#F43F5E",
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
        // Premium landing page animations
        "glow-emerald": "glow-emerald 2.5s ease-in-out infinite",
        "glow-coral": "glow-coral 2s ease-in-out infinite",
        "float-up": "float-up 4s ease-in-out infinite",
        "pulse-subtle": "pulse-subtle 3s ease-in-out infinite",
        "orbit": "orbit 8s linear infinite",
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

        // Premium landing page keyframes
        "glow-emerald": {
          "0%,100%": {
            boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)",
          },
          "50%": {
            boxShadow: "0 0 40px rgba(16, 185, 129, 0.6)",
          },
        },

        "glow-coral": {
          "0%,100%": {
            boxShadow: "0 0 20px rgba(249, 115, 22, 0.3)",
          },
          "50%": {
            boxShadow: "0 0 40px rgba(249, 115, 22, 0.5)",
          },
        },

        "float-up": {
          "0%": {
            transform: "translateY(0)",
            opacity: "0",
          },
          "50%": {
            opacity: "1",
          },
          "100%": {
            transform: "translateY(-100px)",
            opacity: "0",
          },
        },

        "pulse-subtle": {
          "0%,100%": {
            opacity: "1",
          },
          "50%": {
            opacity: "0.8",
          },
        },

        "orbit": {
          "0%": {
            transform: "rotate(0deg) translateX(50px) rotate(0deg)",
          },
          "100%": {
            transform: "rotate(360deg) translateX(50px) rotate(-360deg)",
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
        
        // Premium gradients for landing page
        "gradient-gold-emerald": "linear-gradient(135deg, rgba(245,166,35,0.4) 0%, rgba(16,185,129,0.3) 100%)",
        "gradient-gold-purple": "linear-gradient(135deg, rgba(245,166,35,0.3) 0%, rgba(168,85,247,0.2) 100%)",
        "gradient-emerald-cyan": "linear-gradient(to right, rgba(16,185,129,0.3), rgba(34,197,94,0.2))",
        "gradient-coral-orange": "linear-gradient(135deg, rgba(249,115,22,0.3) 0%, rgba(244,63,94,0.2) 100%)",
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