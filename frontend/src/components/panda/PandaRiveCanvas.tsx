"use client";

import { useEffect, useState } from "react";
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";
import { getGrowthStage, type PandaStats } from "@/utils/pandaHelper";

interface PandaRiveCanvasProps {
  stats: PandaStats;
  showBackground?: boolean;
}

export function PandaRiveCanvas({ stats, showBackground = true }: PandaRiveCanvasProps) {
  // Try loading local asset first, fallback to public interactive bear if local is missing
  const [riveSrc, setRiveSrc] = useState<string>("/animations/panda.riv");
  const [isFallback, setIsFallback] = useState<boolean>(false);

  const { RiveComponent, rive } = useRive({
    src: riveSrc,
    stateMachines: isFallback ? "State Machine 1" : "PandaStateMachine",
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
    onLoadError: () => {
      if (!isFallback) {
        // Fallback to the famous interactive Teddy Bear from Rive Community
        setRiveSrc("https://public.rive.app/community/runtime-files/2244-4437-animated-login-screen.riv");
        setIsFallback(true);
      }
    },
  });

  // Update State Machine inputs based on Panda Stats and Emotion
  useEffect(() => {
    if (!rive) return;

    if (!isFallback) {
      // 1. Standard Panda State Machine Inputs (as per docs/frontend-design.md)
      const inputs = rive.stateMachineInputs("PandaStateMachine");
      if (inputs) {
        const emotionInput = inputs.find((i) => i.name === "emotion");
        const expInput = inputs.find((i) => i.name === "experience_level");
        const tradingInput = inputs.find((i) => i.name === "is_trading");

        if (emotionInput) {
          // Map emotion string to state machine values (e.g. 0: calm, 1: excited, 2: greedy, etc.)
          const emotionMap: Record<string, number> = {
            calm: 0,
            excited: 1,
            greedy: 2,
            cautious: 3,
            panic: 4,
            numb: 5,
            frustrated: 6,
          };
          emotionInput.value = emotionMap[stats.emotion] ?? 0;
        }

        if (expInput) {
          const growthStage = getGrowthStage(stats.experience);
          const stageMap: Record<string, number> = {
            infant: 0,
            apprentice: 1,
            mature: 2,
          };
          expInput.value = stageMap[growthStage] ?? 0;
        }

        if (tradingInput) {
          // Default to true for demo/preview in lab
          tradingInput.value = true;
        }
      }
    } else {
      // 2. Fallback Interactive Teddy Bear State Machine Inputs
      // Inputs: isChecking (boolean), isHandsUp (boolean), numLook (number 0-100)
      const inputs = rive.stateMachineInputs("State Machine 1");
      if (inputs) {
        const isCheckingInput = inputs.find((i) => i.name === "isChecking");
        const isHandsUpInput = inputs.find((i) => i.name === "isHandsUp");
        const numLookInput = inputs.find((i) => i.name === "numLook");

        // Map Emotion to Bear Actions
        if (isHandsUpInput) {
          // Hands up (covers eyes) for panic or frustrated
          isHandsUpInput.value = stats.emotion === "panic" || stats.emotion === "frustrated";
        }

        if (isCheckingInput) {
          // Checking (looks down at keyboard) for cautious or greedy
          isCheckingInput.value = stats.emotion === "cautious" || stats.emotion === "greedy";
        }

        if (numLookInput) {
          // Map focus stat (0-100) to look direction
          numLookInput.value = stats.focus;
        }
      }
    }
  }, [rive, stats, isFallback]);

  return (
    <div className="relative flex h-full w-full min-h-[300px] min-w-[300px] aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#111215]">
      {showBackground && (
        <div className="absolute inset-0 opacity-10">
          {/* Cyber Grid Background */}
          <div className="h-full w-full bg-[linear-gradient(to_right,#f1c40f_1px,transparent_1px),linear-gradient(to_bottom,#f1c40f_1px,transparent_1px)] bg-[size:32px_32px]" />
        </div>
      )}

      {/* Rive Component */}
      <div className="relative z-10 h-full w-full max-w-[90%] max-h-[90%]">
        <RiveComponent />
      </div>

      {/* Overlay status indicator */}
      <div className="absolute bottom-3 left-3 z-20 rounded-md bg-black/60 px-2 py-1 text-[10px] font-mono text-ink-400 backdrop-blur-sm">
        {isFallback ? (
          <span className="text-[#f1c40f]">RIVE FALLBACK (TEDDY BEAR)</span>
        ) : (
          <span className="text-bamboo-500">RIVE ENGINE ACTIVE</span>
        )}
      </div>
    </div>
  );
}
