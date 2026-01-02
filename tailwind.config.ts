import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: { 
				playfair: ["Playfair Display", "serif"],
				bodoni: ["Bodoni Moda", "Georgia", "serif"],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				weather: {
					sunny: 'hsl(var(--weather-sunny))',
					cloudy: 'hsl(var(--weather-cloudy))',
					rainy: 'hsl(var(--weather-rainy))',
					snowy: 'hsl(var(--weather-snowy))'
				},
				gold: 'hsl(var(--gold))',
				'rose-gold': 'hsl(var(--rose-gold))',
				silver: 'hsl(var(--silver))',
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-card': 'var(--gradient-card)',
				'gradient-glow': 'var(--gradient-glow)',
				'gradient-aurora': 'var(--gradient-aurora)',
				'gradient-hero': 'var(--gradient-hero)',
				'gradient-weather': 'var(--gradient-weather)',
				'gradient-shine': 'var(--gradient-shine)',
			},
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-card': 'var(--gradient-card)',
				'gradient-sunny': 'var(--gradient-sunny)',
				'gradient-weather': 'var(--gradient-weather)',
				'gradient-hero': 'var(--gradient-hero)'
			},
			boxShadow: {
				'card': 'var(--shadow-card)',
				'glow': 'var(--shadow-glow)',
				'inner': 'var(--shadow-inner)',
				'elevation': 'var(--shadow-elevation)',
				'soft': 'var(--shadow-soft)',
			},
			backdropBlur: {
				'xs': '2px',
				'glass': '20px'
			},
			animation: {
				'fade-in': 'fade-in 0.6s ease-out',
				'fade-in-up': 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
				'slide-up': 'slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
				'slide-down': 'slide-down 0.7s ease-out',
				'slide-left': 'slide-left 0.7s ease-out',
				'slide-right': 'slide-right 0.7s ease-out',
				'scale-in': 'scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'zoom-in': 'zoom-in 0.5s ease-out',
				'bounce-soft': 'bounce-soft 1s ease-in-out',
				'glow-pulse': 'glow-pulse 3s ease-in-out infinite alternate',
				'float': 'float 5s ease-in-out infinite',
				'float-slow': 'float-slow 20s ease-in-out infinite',
				'icon-glow': 'icon-glow 4s ease-in-out infinite',
				'shimmer': 'shimmer 2s ease-in-out infinite',
				'aurora': 'aurora 15s ease infinite',
				'pulse-ring': 'pulse-ring 2s ease-out infinite',
				'text-gradient': 'text-gradient 8s ease infinite',
				'reveal': 'reveal 1s cubic-bezier(0.16, 1, 0.3, 1)',
				'morph': 'morph 8s ease-in-out infinite',
			},
				'slide-right': 'slide-right 0.7s ease-out',
				'scale-in': 'scale-in 0.4s ease-out',
				'zoom-in': 'zoom-in 0.5s ease-out',
				'bounce-soft': 'bounce-soft 1s ease-in-out',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite alternate',
				'float': 'float 4s ease-in-out infinite',
				'icon-glow': 'icon-glow 3s ease-in-out infinite',
				'shimmer': 'shimmer 1.5s ease-in-out infinite'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-up': {
					'0%': { opacity: '0', transform: 'translateY(100%)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-down': {
					'0%': { opacity: '0', transform: 'translateY(-100%)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-left': {
					'0%': { opacity: '0', transform: 'translateX(100%)' },
					'100%': { opacity: '1', transform: 'translateX(0)' }
				},
				'slide-right': {
					'0%': { opacity: '0', transform: 'translateX(-100%)' },
					'100%': { opacity: '1', transform: 'translateX(0)' }
				},
				'scale-in': {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},
				'zoom-in': {
					'0%': { opacity: '0', transform: 'scale(0.8)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},
				'bounce-soft': {
					'0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
					'40%': { transform: 'translateY(-10px)' },
					'60%': { transform: 'translateY(-5px)' }
				},
				'glow-pulse': {
					'0%': { boxShadow: '0 0 20px hsl(28 100% 60% / 0.3)' },
					'100%': { boxShadow: '0 0 60px hsl(28 100% 60% / 0.6), 0 0 100px hsl(28 100% 60% / 0.3)' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-8px)' }
				},
				'icon-glow': {
					'0%, 100%': { filter: 'drop-shadow(0 0 8px currentColor) drop-shadow(0 0 20px currentColor)' },
					'50%': { filter: 'drop-shadow(0 0 15px currentColor) drop-shadow(0 0 35px currentColor) drop-shadow(0 0 50px currentColor)' }
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				},
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				}
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
