// /frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  // 🚨 這是最關鍵的部分：確保它掃描了所有 .jsx 文件
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // 涵蓋了您所有的頁面和元件
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}