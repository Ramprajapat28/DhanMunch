// src/constants.js

export const GAME_DURATION = 60; // Game duration in seconds
export const INITIAL_SPAWN_RATE = 2000; // Initial bubble spawn rate in ms
export const MIN_SPAWN_RATE = 500; // Minimum spawn rate (max difficulty)
export const SPAWN_RATE_ACCELERATION = 50; // How much to decrease spawn rate by, per spawn

export const GAME_ITEMS = [
  // Income items
  { id: "salary", category: "income", emoji: "💰", label: "Salary" },
  { id: "bonus", category: "income", emoji: "🎁", label: "Bonus" },
  { id: "investment", category: "income", emoji: "📈", label: "Investment" },
  { id: "freelance", category: "income", emoji: "💻", label: "Freelance" },

  // Expense items
  { id: "food", category: "expense", emoji: "🍕", label: "Food" },
  { id: "hotel", category: "expense", emoji: "🏨", label: "Hotel" },
  { id: "shopping", category: "expense", emoji: "🛍️", label: "Shopping" },
  { id: "gas", category: "expense", emoji: "⛽", label: "Gas" },
  { id: "bills", category: "expense", emoji: "📱", label: "Bills" },
];

export const POINTS = {
  CORRECT: 10,
  INCORRECT: -5,
  MISSED: -2,
};
