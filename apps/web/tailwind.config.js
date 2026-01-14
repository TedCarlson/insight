module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: { DEFAULT: 'var(--color-border)' },
        ring: { DEFAULT: 'var(--color-ring)' },
        input: { DEFAULT: 'var(--color-input)' },

        
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
      },
    },
  },
  plugins: [],
};
