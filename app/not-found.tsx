"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function NotFound() {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [panicTriggered, setPanicTriggered] = useState(false);
  const [fakeAds, setFakeAds] = useState<
    { id: number; top: number; left: number; title: string }[]
  >([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setPanicTriggered(true);
          clearInterval(interval);
          // 🔥 Start the automated audio lag loop when the clock hits zero!
          startAudioLagLoop();
          startInfiniteAdSpam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 🔊 The Restructured Audio Engine Loop
  const startAudioLagLoop = () => {
    const soundFiles = [
      "/sounds/call.mp3",
      "/sounds/ring.mp3",
      "/sounds/notification.mp3",
      "/sounds/notification2.mp3",
    ];

    // Run the interval block to loop the sound explosion!
    setInterval(() => {
      soundFiles.forEach((soundPath) => {
        const audioInstance = new Audio(soundPath);
        audioInstance.volume = 1.0;

        // .play() returns a promise. Catching it prevents console errors if a thread drops!
        audioInstance.play().catch((err) => {
          console.log("Audio block bypass log:", err.message);
        });
      });
    }, 1000);
  };

  // 🖼️ DOM Popup Ad Overflow Matrix
  const startInfiniteAdSpam = () => {
    const adTitles: string[] = [
      // 👥 Fictional Minecraft Creator "Near You" Alerts UwU~
      "🗣️ WIFIES IS ANALYZING YOUR COBBLESTONE DROP CHANCE!",
      "⚔️ D3RLORD HAS JOINED YOUR FACTION! TAP TO ACCEPT!",
      "👑 TECHNOBLADE NEVER DIES!",
      "🎒 DREAM UNLOCKED A BOAT CLUTCH IN YOUR NEIGHBORHOOD!",
      "🧱 MUMBO JUMBO IS BUILDING A WALKING HOUSE IN YOUR AREA!",
      "🐺 DAN_TDM HAS FOUND A RARE BLUE AYOLOTL NEARBY!",
      "🕶️ HEROBRINE HAS INTRODUCED HIMSELF INTO YOUR CHUNK MESH!",

      // 🎰 Casino & Lootboxes
      "🎰 MYSTERY CRATE REWARD OUTSTANDING! CLAIM TOKENS!",
      "🎲 LUCKY DAY! ROLL FOR MAX PROTECTION IV NOW!",
      "💰 DOUBLE JACKPOT! TAP TO UNLOCK ALL COPPERS!",
      "🃏 VILLAGER TRADES REFRESHED: MENDING FOR 1 EMERALD!",
      "👑 VIP BEDROCK RANK UNLOCKED! CLAIM NOW!",

      // ⚠️ Fake Security Alerts (Obfuscated to bypass search engine filters! 🤫)
      "⚠️ CR1T1C4L GL1TCH D3T3CT3D!",
      "🛑 CHUNK C0RRUPT10N W4RN1NG! F1X INS1D3!",
      "🚨 CL13NT 1NF3CT3D BY L4G SP1K3! CL34N N0W!",
      "🔒 H4CK3RS L34K3D Y0UR ENV D4T4!",
      "🔥 S3RV3R 0V3RH34T1NG! T00 M4NY ENT1T13S!",

      // 🔴 Downloads & Clients
      "🔴 HOT FORGE MOD DOWNLOAD READY",
      "💾 DUPING_GLITCH_PATCH.EXE COMPLETE",
      "⚡ BOOST OPTIFINE FRAMERATE 500%",
      "📦 MINECRAFT_SECRETS_XRAY_INSTALLER.MSI",
      "🛠️ CRITICAL JAVA RUNTIME UPDATE REQUIRED",

      // 💸 Crypto & Emerald Schemes
      "💸 FREE NETHERITE INYECT NOW",
      "📈 TURN 10 DIAMONDS INTO 10,000 EMERALDS TODAY",
      "🤫 REDSTONE ENGINEERS HATE THIS ONE SIMPLE TRICK",
      "💎 FREE AIRDROP LIVE: CLAIM HYPIXEL COINS",
      "🏡 AFK FARM INCENTIVE: MAKE $500/HOUR",

      // 🎁 Shopping & Fake Deliveries
      "🎁 YOU WON A FREE MINECON CAPE!",
      "📦 CH0PP4: DELIVERING BOXES OUTSIDE COMPASS RADAR",
      "🏷️ 99% OFF ALL SEED MAPS LAST CHANCE",
      "🎟️ $500 STEAM CARD VOUCHER REWARD",
      "🍕 FREE GOLDEN APPLE COUPON INSIDE",
    ];
    let idCounter = 0;

    setInterval(() => {
      setFakeAds((prev) => [
        ...prev,
        {
          // Combines the current timestamp millisecond with a random number! 🎲
          id: Date.now() + Math.random(),
          top: Math.floor(Math.random() * 120) - 10,
          left: Math.floor(Math.random() * 120) - 10,
          title: adTitles[Math.floor(Math.random() * adTitles.length)],
        },
      ]);
    }, 400); // Drop a new pop-up block into the screen stack every 400ms!
  };

  // 💥 The Trap Handler Trigger
  const handlePanicClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setPanicTriggered(true);

    // 🚀 User clicked! The browser now registers this as an official user interaction,
    // unlocking the audio engine completely!
    startAudioLagLoop();
    startInfiniteAdSpam();
  };

  return (
    <div className="min-h-screen bg-[#05050A] text-[#FF9F4A] font-mono p-4 flex flex-col items-center justify-center relative overflow-hidden select-none">
      {/* 🛑 Main Terminal Warning Box */}
      <div className="w-full max-w-lg border-2 border-[#FF9F4A] bg-[#110505] p-6 shadow-[0_0_30px_rgba(255,159,74,0.15)] rounded relative z-10">
        <div className="bg-[#FF9F4A] text-[#14151A] font-bold px-2 py-1 text-xs mb-4 flex justify-between items-center animate-pulse">
          <span>⚠️ [FATAL SYSTEM EXCEPTION]</span>
          <span>CORE_DUMP_v1.0</span>
        </div>

        <div className="space-y-3 text-xs sm:text-sm leading-relaxed break-words">
          <p className="text-[#EDEAE3]">
            <span className="text-[#6C7BFF]">looming_kernel:</span>{" "}
            CRITICAL_EXCEPTION_UNHANDLED_INTERRUPT
          </p>
          <div className="border-l-2 border-[#FF9F4A]/40 pl-3 text-[#8A8D98]">
            <p>&gt; MEMORY_SECTOR: 0x00F404_NULL_SLUG</p>
            <p>&gt; THREAD_STATUS: TERMINATED_BY_CRON_SWEEP</p>
          </div>

          <div className="bg-[#1A0B0B] border border-[#FF9F4A]/30 rounded p-3 text-center my-4">
            {!panicTriggered ? (
              <p className="text-[#FF9F4A] font-bold animate-pulse">
                🔥 PURGING LOCAL COOKIES & APP SESSIONS IN:{" "}
                <span className="text-xl text-[#EDEAE3]">{secondsLeft}s</span>
              </p>
            ) : (
              <p className="text-[#FF5555] font-bold tracking-widest uppercase animate-mini-ping">
                🛑 SESSION LOCKOUT ACTIVE 🛑
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#2A2C35] flex items-center justify-between">
          <span className="text-[10px] text-[#8A8D98]">
            Error Code: 404_STALE_THREAD_DELETION
          </span>
          <button
            onClick={handlePanicClick}
            className="text-xs px-4 py-2 rounded bg-[#FF9F4A] text-[#14151A] font-bold hover:bg-[#EDEAE3] active:scale-95 transition-all"
          >
            Bypass Lockout &gt;
          </button>
        </div>
      </div>

      {/* 🎰 FLOOD OF OVERFLOWING FAKE AD POPUPS OVER THE ENTIRE VIEWPORT */}
      {fakeAds.map((ad) => (
        <div
          key={ad.id}
          className="absolute w-64 p-3 bg-red-600 border-4 border-yellow-400 shadow-2xl font-sans text-white text-center rounded animate-bounce z-50 select-none cursor-not-allowed"
          style={{ top: `${ad.top}%`, left: `${ad.left}%` }}
        >
          <div className="bg-yellow-400 text-black text-[10px] font-bold py-0.5 px-1 uppercase flex justify-between mb-2">
            <span>[ADVERTISEMENT]</span>
            <span>X</span>
          </div>
          <h2 className="text-sm font-black tracking-tighter blink mb-1">
            {ad.title}
          </h2>
          <p className="text-[10px] text-yellow-100">
            Clicking 'X' installs cleaner.exe
          </p>
        </div>
      ))}
    </div>
  );
}
