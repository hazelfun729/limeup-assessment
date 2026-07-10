"use client";

import { motion } from "framer-motion";

const nodes = [
  { x: "20%", y: "25%", size: 6, delay: 0 },
  { x: "35%", y: "15%", size: 4, delay: 0.3 },
  { x: "50%", y: "30%", size: 8, delay: 0.6 },
  { x: "65%", y: "20%", size: 5, delay: 0.9 },
  { x: "80%", y: "35%", size: 7, delay: 1.2 },
  { x: "25%", y: "55%", size: 5, delay: 0.4 },
  { x: "45%", y: "65%", size: 6, delay: 0.7 },
  { x: "60%", y: "50%", size: 4, delay: 1.0 },
  { x: "75%", y: "60%", size: 8, delay: 0.2 },
  { x: "15%", y: "75%", size: 4, delay: 0.5 },
  { x: "40%", y: "80%", size: 6, delay: 0.8 },
  { x: "70%", y: "78%", size: 5, delay: 1.1 },
  { x: "85%", y: "70%", size: 4, delay: 0.1 },
  { x: "55%", y: "85%", size: 7, delay: 0.6 },
];

const connections = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5],
  [5, 6], [6, 7], [7, 8], [2, 6], [5, 9],
  [9, 10], [10, 11], [8, 12], [10, 13],
];

export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

      {/* SVG connections */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        {connections.map(([from, to], i) => (
          <motion.line
            key={i}
            x1={nodes[from].x}
            y1={nodes[from].y}
            x2={nodes[to].x}
            y2={nodes[to].y}
            stroke="currentColor"
            strokeWidth={0.5}
            className="text-primary/20"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: 2,
              delay: nodes[from].delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>

      {/* Nodes */}
      {nodes.map((node, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary/40"
          style={{
            left: node.x,
            top: node.y,
            width: node.size,
            height: node.size,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.8,
            delay: node.delay,
            ease: "easeOut",
          }}
        >
          <motion.div
            className="h-full w-full rounded-full bg-primary/30"
            animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
            transition={{
              duration: 4,
              delay: node.delay + 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}
