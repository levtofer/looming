"use client";

import { useEffect, useState } from "react";

export default function NotFound() {
  const [night, setNight] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      const hour = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          hour12: false,
        }).format(new Date()),
      );

      setNight(hour >= 18 || hour < 6);
      setReady(true);
    };

    checkTime();

    const interval = setInterval(checkTime, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className={`dot-page ${night ? "night" : ""} ${ready ? "ready" : ""}`}>
      <div className="noise" aria-hidden="true" />

      <div className="content-wrapper">
        <header className="top flow-obscured">
          <span>30.07.2027</span>
        </header>

        <section className="center">
          <div className="black-dot-container">
            <div className="black-dot-breathing">
              <div className="black-dot" />
            </div>
          </div>

          <div className="message flow-obscured">
            <span>Greetings and salutations.</span>
            <p>Would you take your time?</p>
          </div>
        </section>

        <footer className="bottom flow-obscured">
          <span></span>
          <span>01 / 01</span>
        </footer>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Flow+Circular&display=swap');

        .dot-page {
          opacity: 0;
        }

        .dot-page.ready {
          opacity: 1;
          transition: opacity 1800ms ease;
        }

        .dot-page {
          --paper: #e9e5dc;
          --ink: #25231f;
          --muted: rgba(37, 35, 31);

          position: relative;
          min-height: 100dvh;
          overflow: hidden;
          box-sizing: border-box;
          background: var(--paper);
          color: var(--ink);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .dot-page.night {
          filter: invert(1);
        }

        .noise {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          opacity: 0.055;
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxODAiIGhlaWdodD0iMTgwIiB2aWV3Qm94PSIwIDAgMTgwIDE4MCI+PGZpbHRlciBpZD0ibiI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9Ii44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+");
        }

        .content-wrapper {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 100dvh;
          box-sizing: border-box;
          padding: 28px;
        }

        .flow-obscured {
          font-family: "Flow Circular", system-ui, sans-serif;
        }

        .top,
        .bottom {
          display: flex;
          width: 100%;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.05em;
        }

        .center {
          display: flex;
          width: min(600px, 100%);
          flex-direction: column;
          align-items: center;
          justify-content: center;
          align-self: center;
          margin: auto 0;
          text-align: center;
        }

        .black-dot-container {
          display: flex;
          width: 110px;
          height: 110px;
          align-items: center;
          justify-content: center;
          margin-bottom: 50px;
        }

        .black-dot-breathing {
          animation: breathing 7s cubic-bezier(0.37, 0, 0.63, 1) infinite;
        }

        .black-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--ink);
          transform-origin: center;
          animation: blinking 9s ease-in-out infinite;
        }

        .message span {
          display: block;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .message p {
          margin: 12px 0 0;
          color: var(--muted);
          font-size: 14px;
          letter-spacing: 0.02em;
        }

        @keyframes breathing {
          0% { transform: scale(0.88); }
          25% { transform: scale(0.96); }
          50% { transform: scale(1.08); }
          68% { transform: scale(1.1); }
          100% { transform: scale(0.88); }
        }

        @keyframes blinking {
          0%, 72%, 100% { transform: scaleY(1); }
          74% { transform: scaleY(0.7); }
          75% { transform: scaleY(0); }
          76% { transform: scaleY(0.7); }
          77% { transform: scaleY(1); }
        }

        @media (max-width: 600px) {
          .content-wrapper {
            padding: 18px;
          }

          .black-dot-container {
            width: 82px;
            height: 82px;
            margin-bottom: 40px;
          }

          .black-dot {
            width: 18px;
            height: 18px;
          }

          .message span {
            font-size: 15px;
          }

          .message p {
            font-size: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .black-dot {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
