import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Howl } from "howler";
import "./App.css";

// ===================================================================================
// 1. CONSTANTS & CONFIGURATION
// ===================================================================================

const GAME_DURATION = 60;
const INITIAL_SPAWN_RATE = 2000;
const MIN_SPAWN_RATE = 500;
const SPAWN_RATE_ACCELERATION = 50;

const GAME_ITEMS = [
  { id: "salary", category: "income", emoji: "💰", label: "Salary" },
  { id: "bonus", category: "income", emoji: "🎁", label: "Bonus" },
  { id: "investment", category: "income", emoji: "📈", label: "Investment" },
  { id: "freelance", category: "income", emoji: "💻", label: "Freelance" },
  { id: "food", category: "expense", emoji: "🍕", label: "Food" },
  { id: "hotel", category: "expense", emoji: "🏨", label: "Hotel" },
  { id: "shopping", category: "expense", emoji: "🛍️", label: "Shopping" },
  { id: "gas", category: "expense", emoji: "⛽", label: "Gas" },
  { id: "bills", category: "expense", emoji: "📱", label: "Bills" },
];

const POINTS = {
  CORRECT: 10,
  INCORRECT: -5,
  MISSED: -2,
};

// Sound setup with error handling
const createSound = (src) => {
  try {
    return new Howl({ src: [src], volume: 0.3 });
  } catch (error) {
    console.warn(`Could not load sound: ${src}`);
    return { play: () => {} }; // Mock sound object
  }
};

const sounds = {
  correct: createSound("/sounds/correct.mp3"),
  incorrect: createSound("/sounds/incorrect.mp3"),
  gameOver: createSound("/sounds/gameOver.wav"),
};

// ===================================================================================
// 2. CUSTOM HOOK: useGameLogic
// ===================================================================================

const useGameLogic = () => {
  const [gameState, setGameState] = useState("idle");
  const [bubbles, setBubbles] = useState([]);
  const [score, setScore] = useState({ income: 0, expense: 0 });
  const [timer, setTimer] = useState(GAME_DURATION);
  const spawnRate = useRef(INITIAL_SPAWN_RATE);
  const bubbleIdCounter = useRef(0);

  const gameTimerRef = useRef(null);
  const bubbleSpawnerRef = useRef(null);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (bubbleSpawnerRef.current) clearTimeout(bubbleSpawnerRef.current);
    };
  }, []);

  const startGame = useCallback(() => {
    console.log("🚀 Starting game..."); // Debug

    // Clear any existing timers
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (bubbleSpawnerRef.current) clearTimeout(bubbleSpawnerRef.current);

    setGameState("playing");
    setScore({ income: 0, expense: 0 });
    setBubbles([]);
    setTimer(GAME_DURATION);
    spawnRate.current = INITIAL_SPAWN_RATE;
    bubbleIdCounter.current = 0;

    // Start game timer
    gameTimerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(gameTimerRef.current);
          clearTimeout(bubbleSpawnerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start spawning bubbles
    const spawnLoop = () => {
      console.log("🫧 Spawning bubble..."); // Debug
      spawnBubble();
      bubbleSpawnerRef.current = setTimeout(() => {
        if (gameTimerRef.current) spawnLoop();
      }, spawnRate.current);
    };

    // Initial spawn
    setTimeout(spawnLoop, 500); // Small delay to ensure canvas is ready
  }, []);

  useEffect(() => {
    if (timer <= 0 && gameState === "playing") {
      console.log("⏰ Game over!"); // Debug
      setGameState("gameOver");
      sounds.gameOver.play();
      clearInterval(gameTimerRef.current);
      clearTimeout(bubbleSpawnerRef.current);
      setBubbles([]);
    }
  }, [timer, gameState]);

  const spawnBubble = useCallback(() => {
    if (gameState !== "playing") {
      console.log("❌ Not spawning - game not playing"); // Debug
      return;
    }

    const randomItem =
      GAME_ITEMS[Math.floor(Math.random() * GAME_ITEMS.length)];
    const newBubble = {
      ...randomItem,
      id: `bubble-${++bubbleIdCounter.current}-${Date.now()}`,
    };

    console.log("✅ Spawned:", newBubble.label, newBubble.id); // Debug
    setBubbles((prev) => {
      const newBubbles = [...prev, newBubble];
      console.log("📊 Total bubbles:", newBubbles.length); // Debug
      return newBubbles;
    });

    spawnRate.current = Math.max(
      MIN_SPAWN_RATE,
      spawnRate.current - SPAWN_RATE_ACCELERATION
    );
  }, [gameState]);

  const handleDrop = useCallback((item, binType) => {
    console.log(`🎯 Dropped ${item.label} in ${binType} bin`); // Debug
    setBubbles((prev) => prev.filter((b) => b.id !== item.id));

    if (item.category === binType) {
      sounds.correct.play();
      setScore((prev) => ({
        ...prev,
        [binType]: prev[binType] + POINTS.CORRECT,
      }));
    } else {
      sounds.incorrect.play();
      setScore((prev) => ({
        ...prev,
        [binType]: Math.max(0, prev[binType] + POINTS.INCORRECT),
      }));
    }
  }, []);

  const handleMiss = useCallback((item) => {
    console.log(`💔 Missed: ${item.label}`); // Debug
    setBubbles((prev) => prev.filter((b) => b.id !== item.id));
    setScore((prev) => ({
      ...prev,
      [item.category]: Math.max(0, prev[item.category] + POINTS.MISSED),
    }));
  }, []);

  return {
    gameState,
    score,
    bubbles,
    timer,
    startGame,
    handleDrop,
    handleMiss,
  };
};

// ===================================================================================
// 3. COMPONENTS
// ===================================================================================

function Bubble({
  item,
  onDrop,
  onMiss,
  canvasRef,
  incomeBinRef,
  expenseBinRef,
}) {
  const [isDragging, setIsDragging] = useState(false);

  // Simple fallback values
  const canvasWidth = canvasRef.current?.clientWidth || 800;
  const canvasHeight = canvasRef.current?.clientHeight || 600;
  const fallDuration = 10; // Fixed duration for consistency

  console.log(
    `🫧 Bubble ${item.label} created - Canvas: ${canvasWidth}x${canvasHeight}`
  ); // Debug

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    if (!canvasRef.current) return;

    const dropX = info.point.x;
    const dropY = info.point.y;
    let droppedBin = null;

    // Check bins
    const incomeRect = incomeBinRef.current?.getBoundingClientRect();
    if (
      incomeRect &&
      dropX >= incomeRect.left &&
      dropX <= incomeRect.right &&
      dropY >= incomeRect.top &&
      dropY <= incomeRect.bottom
    ) {
      droppedBin = "income";
    }

    const expenseRect = expenseBinRef.current?.getBoundingClientRect();
    if (
      !droppedBin &&
      expenseRect &&
      dropX >= expenseRect.left &&
      dropX <= expenseRect.right &&
      dropY >= expenseRect.top &&
      dropY <= expenseRect.bottom
    ) {
      droppedBin = "expense";
    }

    if (droppedBin) {
      onDrop(item, droppedBin);
    } else {
      onMiss(item);
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.2}
      onDragStart={() => {
        console.log(`🖱️ Started dragging ${item.label}`); // Debug
        setIsDragging(true);
      }}
      onDragEnd={handleDragEnd}
      onAnimationComplete={() => {
        console.log(`⬇️ ${item.label} finished falling`); // Debug
        if (!isDragging) {
          onMiss(item);
        }
      }}
      initial={{
        y: -120,
        x: Math.random() * Math.max(0, canvasWidth - 80),
        opacity: 0,
        scale: 0.5,
      }}
      animate={{
        y: canvasHeight + 120, // Explicit target
        opacity: 1,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        scale: 0.3,
        transition: { duration: 0.3 },
      }}
      transition={{
        y: { duration: fallDuration, ease: "linear", type: "tween" },
        opacity: { duration: 0.5 },
        scale: { duration: 0.5 },
      }}
      className={`absolute w-20 h-20 bg-white/95 rounded-full shadow-xl flex flex-col items-center justify-center cursor-grab border-3 ${
        item.category === "income" ? "border-green-500" : "border-red-500"
      } ${isDragging ? "cursor-grabbing scale-125 z-50 shadow-2xl" : "z-10"}`}
      whileHover={{ scale: isDragging ? 1.25 : 1.1 }}
      whileTap={{ scale: 1.3 }}
      style={{
        willChange: "transform",
        backfaceVisibility: "hidden", // Performance optimization
      }}
    >
      <span className="text-2xl select-none pointer-events-none">
        {item.emoji}
      </span>
      <span className="text-[9px] font-bold select-none pointer-events-none text-center leading-tight">
        {item.label}
      </span>
    </motion.div>
  );
}

const BinIcon = ({ type }) => (
  <svg
    className={`w-full h-full drop-shadow-lg ${
      type === "income" ? "text-green-600" : "text-red-600"
    }`}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

function Bin({ type, score, binRef }) {
  const isIncome = type === "income";
  return (
    <motion.div
      ref={binRef}
      className="w-32 h-32 md:w-40 md:h-40 flex flex-col items-center justify-center relative select-none"
      whileHover={{ scale: 1.05 }}
      animate={{
        scale: score > 0 ? [1, 1.1, 1] : 1,
      }}
      transition={{ duration: 0.3 }}
    >
      <BinIcon type={type} />
      <div
        className={`absolute -top-4 text-white px-3 py-1 rounded-full text-lg font-bold shadow-md ${
          isIncome ? "bg-green-500" : "bg-red-500"
        }`}
      >
        {score}
      </div>
      <span className="absolute bottom-[-30px] font-bold text-lg text-white drop-shadow-md">
        {isIncome ? "Income" : "Expenses"}
      </span>
    </motion.div>
  );
}

function GameOverlay({ gameState, startGame, score }) {
  if (gameState === "playing") return null;
  const isGameOver = gameState === "gameOver";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-30 text-white"
    >
      {isGameOver && (
        <motion.div
          className="text-center mb-8"
          initial={{ scale: 0.5, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <h2 className="text-5xl md:text-6xl font-extrabold text-white drop-shadow-lg mb-4">
            Game Over!
          </h2>
          <p className="text-xl md:text-2xl mb-2">Final Score:</p>
          <p className="text-6xl md:text-7xl font-bold text-yellow-300 drop-shadow-lg">
            {score}
          </p>
        </motion.div>
      )}
      <motion.button
        onClick={startGame}
        className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-4 px-10 rounded-full text-2xl shadow-2xl"
        whileHover={{ scale: 1.1, y: -5 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: isGameOver ? 0.5 : 0, duration: 0.3 }}
      >
        {isGameOver ? "🚀 Play Again" : "🚀 Start Game"}
      </motion.button>
    </motion.div>
  );
}

// ===================================================================================
// 4. MAIN APP COMPONENT
// ===================================================================================

function App() {
  const canvasRef = useRef(null);
  const incomeBinRef = useRef(null);
  const expenseBinRef = useRef(null);

  const {
    gameState,
    score,
    bubbles,
    timer,
    startGame,
    handleDrop,
    handleMiss,
  } = useGameLogic();

  const totalScore = score.income + score.expense;

  // Debug canvas dimensions
  useEffect(() => {
    if (canvasRef.current) {
      console.log("📏 Canvas dimensions:", {
        width: canvasRef.current.clientWidth,
        height: canvasRef.current.clientHeight,
        gameState,
        bubblesCount: bubbles.length,
      });
    }
  }, [gameState, bubbles.length]);

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 text-slate-800 items-center justify-center font-sans overflow-hidden">
      <div className="text-center mb-6 px-4">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent mb-2 drop-shadow-lg">
          💰 Financial Catch 💸
        </h1>
        <p className="text-white text-lg md:text-xl font-medium drop-shadow-md max-w-2xl">
          Drag income items to the{" "}
          <span className="text-green-300 font-bold">green bin</span> and
          expenses to the{" "}
          <span className="text-red-300 font-bold">red bin</span>!
        </p>
      </div>

      <div
        ref={canvasRef}
        className="canvas h-[70vh] rounded-3xl w-[95vw] md:w-[85vw] max-w-5xl bg-gradient-to-b from-sky-300 to-sky-500 relative overflow-hidden border-4 border-white shadow-2xl"
        style={{ minHeight: "400px" }} // Ensure minimum height
      >
        <AnimatePresence mode="popLayout">
          {gameState === "playing" &&
            bubbles.map((bubble) => (
              <Bubble
                key={bubble.id}
                item={bubble}
                onDrop={handleDrop}
                onMiss={handleMiss}
                canvasRef={canvasRef}
                incomeBinRef={incomeBinRef}
                expenseBinRef={expenseBinRef}
              />
            ))}
        </AnimatePresence>

        <GameOverlay
          gameState={gameState}
          startGame={startGame}
          score={totalScore}
        />

        {gameState !== "idle" && (
          <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end">
            <Bin type="income" score={score.income} binRef={incomeBinRef} />
            <div className="text-center text-white pb-8">
              <div className="text-4xl font-bold drop-shadow-lg mb-2">
                {timer}s
              </div>
              <div className="text-2xl font-bold drop-shadow-lg">
                Score: {totalScore}
              </div>
            </div>
            <Bin type="expense" score={score.expense} binRef={expenseBinRef} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
