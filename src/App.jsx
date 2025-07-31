import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Howl } from "howler";
import "./App.css";

import {
  GAME_DURATION,
  INITIAL_SPAWN_RATE,
  MIN_SPAWN_RATE,
  SPAWN_RATE_ACCELERATION,
  GAME_ITEMS,
  POINTS,
} from "./constants";

const createSound = (src) => {
  try {
    return new Howl({ src: [src], volume: 0.3 });
  } catch (error) {
    console.warn(`Could not load sound: ${src}`);
    return { play: () => {} };
  }
};

const sounds = {
  correct: createSound("/sounds/correct.mp3"),
  incorrect: createSound("/sounds/incorrect.mp3"),
  gameOver: createSound("/sounds/gameOver.wav"),
};

const useGameLogic = () => {
  const [gameState, setGameState] = useState("idle"); // idle | playing | gameOver
  const [bubbles, setBubbles] = useState([]);
  const [score, setScore] = useState({ income: 0, expense: 0 });
  const [timer, setTimer] = useState(GAME_DURATION);
  const spawnRate = useRef(INITIAL_SPAWN_RATE);
  const bubbleIdCounter = useRef(0);

  const gameStateRef = useRef("idle");
  const gameTimerRef = useRef(null);
  const bubbleSpawnerRef = useRef(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (bubbleSpawnerRef.current) clearTimeout(bubbleSpawnerRef.current);
    };
  }, []);

  const spawnBubble = useCallback(() => {
    if (gameStateRef.current !== "playing") {
      return;
    }

    const randomItem = GAME_ITEMS[Math.floor(Math.random() * GAME_ITEMS.length)];
    const newBubble = {
      ...randomItem,
      id: `bubble-${++bubbleIdCounter.current}-${Date.now()}`,
    };

    setBubbles((prev) => [...prev, newBubble]);

    spawnRate.current = Math.max(
      MIN_SPAWN_RATE,
      spawnRate.current - SPAWN_RATE_ACCELERATION
    );
  }, []);

  const startGame = useCallback(() => {
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (bubbleSpawnerRef.current) clearTimeout(bubbleSpawnerRef.current);

    setGameState("playing");
    setScore({ income: 0, expense: 0 });
    setBubbles([]);
    setTimer(GAME_DURATION);
    spawnRate.current = INITIAL_SPAWN_RATE;
    bubbleIdCounter.current = 0;

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

    const spawnLoop = () => {
      spawnBubble();
      if (gameStateRef.current === "playing") {
        bubbleSpawnerRef.current = setTimeout(spawnLoop, spawnRate.current);
      }
    };

    setTimeout(spawnLoop, 100);
  }, [spawnBubble]);

  useEffect(() => {
    if (timer <= 0 && gameState === "playing") {
      setGameState("gameOver");
      sounds.gameOver.play();
      clearInterval(gameTimerRef.current);
      clearTimeout(bubbleSpawnerRef.current);
      setBubbles([]);
    }
  }, [timer, gameState]);

  const handleDrop = useCallback((item, binType) => {
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

function Bubble({ item, onDrop, onMiss, canvasRef, incomeBinRef, expenseBinRef }) {
  const [isDragging, setIsDragging] = useState(false);

  const canvasWidth = canvasRef.current?.clientWidth || 800;
  const canvasHeight = canvasRef.current?.clientHeight || 600;
  const fallDuration = 8;

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    if (!canvasRef.current) return;

    const dropX = info.point.x;
    const dropY = info.point.y;
    let droppedBin = null;

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
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onAnimationComplete={() => {
        if (!isDragging) {
          onMiss(item);
        }
      }}
      initial={{
        y: -120,
        x: Math.random() * Math.max(0, canvasWidth - 80),
        opacity: 0,
        scale: 0.8,
      }}
      animate={{
        y: canvasHeight + 120,
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
        backfaceVisibility: "hidden",
      }}
    >
      <span className="text-2xl select-none pointer-events-none">{item.emoji}</span>
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

function App() {
  const canvasRef = useRef(null);
  const incomeBinRef = useRef(null);
  const expenseBinRef = useRef(null);

  const { gameState, score, bubbles, timer, startGame, handleDrop, handleMiss } =
    useGameLogic();

  const totalScore = score.income + score.expense;

  return (
    <div className="flex flex-col h-screen w-full bg-[#F7F5F1] text-slate-800 items-center justify-center font-sans overflow-hidden">
      <div className="text-center mb-6 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-black mb-2">
          Catch the items!
        </h1>
        <p className="text-gray-600 text-base md:text-lg max-w-2xl">
          The Computer Society Of India is a non-profit professional body that
          meets to exchange views and information to learn and share ideas.
          Being a national level committee, we work together to discuss
          technology with like-minded people.
        </p>
      </div>

      <div
        ref={canvasRef}
        className="canvas h-[70vh] rounded-3xl w-[95vw] md:w-[85vw] max-w-5xl bg-white relative overflow-hidden border-4 border-sky-300 shadow-lg flex items-center justify-center"
        style={{ minHeight: "600px" }}
      >
        <AnimatePresence mode="popLayout">
          {gameState === "idle" && (
            <motion.div
              key="start"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center"
            >
              <button
                onClick={startGame}
                className="bg-green-500 text-white font-bold py-4 px-10 rounded-lg text-2xl shadow-lg hover:bg-green-600 transition-colors duration-300"
              >
                Start Playing
              </button>
            </motion.div>
          )}

          {gameState === "playing" && (
            <>
              <div className="absolute top-4 left-4 right-4 bg-gray-100 rounded-full p-2 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-8 ml-4">
                  <span className="font-bold text-lg">Score: {totalScore}</span>
                  <span className="font-bold text-lg">Time left: {timer}s</span>
                  <span className="font-bold text-lg">Lives: ♥♥♥</span>
                </div>
                <div className="w-1/2 h-4 bg-gray-300 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(timer / GAME_DURATION) * 100}%` }}
                  ></div>
                </div>
              </div>
              {bubbles.map((bubble) => (
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
              <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-around items-end">
                <Bin type="income" score={score.income} binRef={incomeBinRef} />
                <Bin type="expense" score={score.expense} binRef={expenseBinRef} />
              </div>
            </>
          )}

          {gameState === "gameOver" && (
            <motion.div
              key="gameOver"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-30 text-white p-6 rounded-2xl mx-auto max-w-3xl"
            >
              <motion.h1
                className="mb-8 text-5xl md:text-6xl font-extrabold text-white drop-shadow-lg"
                initial={{ scale: 0.5, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: "spring" }}
              >
                Game Over!
              </motion.h1>

              <div className="flex justify-evenly w-full mb-10">
                <div className="flex flex-col items-center">
                  <span className="text-4xl text-yellow-300 mb-2">🏆</span>
                  <div className="text-lg text-gray-200 mb-1">Final Score:</div>
                  <div className="font-bold text-5xl">{totalScore}</div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-4xl text-yellow-300 mb-2">⏱️</span>
                  <div className="text-lg text-gray-200 mb-1">Time Taken:</div>
                  <div className="font-bold text-5xl">{GAME_DURATION - timer}s</div>
                </div>
              </div>

              <div className="mx-auto bg-blue-50 rounded-xl w-2/5 p-6 mb-10 shadow-lg">
                <div className="text-sm mb-1 text-gray-700 text-center">Your level</div>
                <div className="text-6xl text-green-700 font-bold text-center">
                  {Math.floor(totalScore / 50) + 1}
                </div>
                <div className="text-gray-500 font-semibold text-sm text-center">
                  Amateur
                </div>
              </div>

              <div className="italic text-gray-300 mb-12 text-lg text-center">
                Keep Trying!
              </div>

              <div className="flex gap-6 w-full justify-center px-6 max-w-md">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 py-4 rounded-lg border border-gray-300 bg-white cursor-pointer text-base font-medium text-gray-900 hover:bg-gray-100 transition"
                >
                  ← Go Back
                </button>
                <button
                  onClick={startGame}
                  className="flex-1 py-4 rounded-lg border-0 bg-green-600 text-white text-base font-semibold cursor-pointer hover:bg-green-700 transition"
                >
                  Play Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
