import { cn } from "@/lib/utils";

export function ArenaPoster({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden border-2 border-border bg-card shadow-xl", className)}
      aria-label="Illustration SVG d'une arene de session avec timer, joueurs et phases"
    >
      <svg
        viewBox="0 0 720 520"
        role="img"
        aria-hidden="true"
        className="h-full min-h-[320px] w-full bg-[#131313]"
      >
        <defs>
          <pattern id="arena-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="#2d2d2d" strokeWidth="2" />
          </pattern>
          <linearGradient id="arena-glow" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffdc58" />
            <stop offset="55%" stopColor="#ff4d8d" />
            <stop offset="100%" stopColor="#69e1ff" />
          </linearGradient>
          <filter id="hard-glow">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffdc58" />
          </filter>
        </defs>

        <rect width="720" height="520" fill="url(#arena-grid)" />
        <rect x="28" y="28" width="664" height="464" fill="#fff7e8" stroke="#000" strokeWidth="8" />
        <rect x="54" y="54" width="612" height="412" fill="#151515" stroke="#000" strokeWidth="6" />

        <path
          d="M96 350 C158 248 224 198 326 188 C440 176 526 224 610 332"
          fill="none"
          stroke="url(#arena-glow)"
          strokeWidth="18"
          strokeLinecap="square"
          filter="url(#hard-glow)"
        />
        <path d="M116 384H604L560 432H160Z" fill="#ffdc58" stroke="#000" strokeWidth="6" />
        <path d="M162 400H555" stroke="#000" strokeWidth="4" strokeDasharray="14 12" />

        <g transform="translate(280 104)">
          <rect x="0" y="0" width="160" height="86" fill="#fff7e8" stroke="#000" strokeWidth="6" />
          <rect
            x="10"
            y="10"
            width="140"
            height="24"
            fill="#ffdc58"
            stroke="#000"
            strokeWidth="4"
          />
          <text
            x="80"
            y="62"
            textAnchor="middle"
            fontFamily="monospace"
            fontSize="28"
            fontWeight="800"
            fill="#fff7e8"
          >
            02:48
          </text>
        </g>

        {[
          { x: 126, y: 258, color: "#69e1ff", label: "P1" },
          { x: 238, y: 292, color: "#ff4d8d", label: "P2" },
          { x: 482, y: 286, color: "#98f56c", label: "P3" },
          { x: 590, y: 250, color: "#ffdc58", label: "P4" },
        ].map((player) => (
          <g key={player.label} transform={`translate(${player.x} ${player.y})`}>
            <rect
              x="-28"
              y="-28"
              width="56"
              height="56"
              fill={player.color}
              stroke="#000"
              strokeWidth="6"
            />
            <circle cx="0" cy="-7" r="8" fill="#000" />
            <path d="M-12 13H12" stroke="#000" strokeWidth="6" strokeLinecap="square" />
            <text
              x="0"
              y="50"
              textAnchor="middle"
              fontFamily="monospace"
              fontSize="18"
              fontWeight="900"
              fill="#fff7e8"
            >
              {player.label}
            </text>
          </g>
        ))}

        <g transform="translate(72 86)">
          <rect width="158" height="92" fill="#fff7e8" stroke="#000" strokeWidth="5" />
          <text x="18" y="32" fontFamily="monospace" fontSize="16" fontWeight="900" fill="#000">
            PHASE 02
          </text>
          <rect
            x="18"
            y="48"
            width="118"
            height="14"
            fill="#ffdc58"
            stroke="#000"
            strokeWidth="3"
          />
          <rect x="18" y="68" width="82" height="10" fill="#69e1ff" stroke="#000" strokeWidth="3" />
        </g>

        <g transform="translate(500 86)">
          <rect width="142" height="110" fill="#fff7e8" stroke="#000" strokeWidth="5" />
          <text x="16" y="30" fontFamily="monospace" fontSize="14" fontWeight="900" fill="#000">
            SCORE
          </text>
          <text x="16" y="72" fontFamily="monospace" fontSize="36" fontWeight="900" fill="#000">
            +250
          </text>
        </g>
      </svg>
    </div>
  );
}

export function RoundMapSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      role="img"
      aria-label="Carte SVG des phases: lobby, round, resolution et resultats"
      className={cn("h-auto w-full", className)}
    >
      <rect width="420" height="220" fill="#fff7e8" stroke="#000" strokeWidth="5" />
      {[
        ["Lobby", 26, 70, "#69e1ff"],
        ["Round", 126, 34, "#ffdc58"],
        ["Decision", 234, 78, "#ff4d8d"],
        ["Credits", 320, 38, "#98f56c"],
      ].map(([label, x, y, fill], index) => (
        <g key={label}>
          <rect
            x={Number(x)}
            y={Number(y)}
            width="74"
            height="74"
            fill={String(fill)}
            stroke="#000"
            strokeWidth="4"
          />
          <text
            x={Number(x) + 37}
            y={Number(y) + 42}
            textAnchor="middle"
            fontFamily="monospace"
            fontSize="11"
            fontWeight="900"
            fill="#000"
          >
            {label}
          </text>
          {index < 3 && (
            <path
              d={`M${Number(x) + 78} ${Number(y) + 37} L${Number(x) + 104} ${Number(y) + 37}`}
              stroke="#000"
              strokeWidth="4"
              strokeLinecap="square"
            />
          )}
        </g>
      ))}
    </svg>
  );
}

export function CatalogueWallSvg({ className }: { className?: string }) {
  const cards = [
    { x: 28, y: 34, fill: "#69e1ff", title: "Sprint", meta: "12/16" },
    { x: 172, y: 22, fill: "#ffdc58", title: "Duel", meta: "06/08" },
    { x: 316, y: 46, fill: "#ff4d8d", title: "Quiz", meta: "20/24" },
    { x: 100, y: 156, fill: "#98f56c", title: "Rush", meta: "04/12" },
    { x: 244, y: 148, fill: "#fff7e8", title: "Finale", meta: "02/04" },
  ];

  return (
    <svg
      viewBox="0 0 520 300"
      role="img"
      aria-label="Mur SVG de cartes catalogue avec statuts et capacites"
      className={cn("h-auto w-full", className)}
    >
      <rect width="520" height="300" fill="#151515" stroke="#000" strokeWidth="6" />
      <path d="M0 64H520M0 128H520M0 192H520M0 256H520" stroke="#2d2d2d" strokeWidth="3" />
      <path
        d="M64 0V300M128 0V300M192 0V300M256 0V300M320 0V300M384 0V300M448 0V300"
        stroke="#2d2d2d"
        strokeWidth="3"
      />
      {cards.map((card, index) => (
        <g key={card.title} transform={`translate(${card.x} ${card.y})`}>
          <rect x="8" y="8" width="132" height="86" fill="#000" />
          <rect width="132" height="86" fill={card.fill} stroke="#000" strokeWidth="5" />
          <rect
            x="12"
            y="12"
            width="108"
            height="14"
            fill="#151515"
            stroke="#000"
            strokeWidth="3"
          />
          <text x="14" y="52" fontFamily="monospace" fontSize="19" fontWeight="900" fill="#000">
            {card.title}
          </text>
          <text x="14" y="73" fontFamily="monospace" fontSize="13" fontWeight="900" fill="#000">
            {card.meta}
          </text>
          <circle
            cx="106"
            cy="60"
            r="12"
            fill={index % 2 === 0 ? "#fff7e8" : "#151515"}
            stroke="#000"
            strokeWidth="4"
          />
        </g>
      ))}
      <g transform="translate(384 204)">
        <rect width="98" height="48" fill="#ffdc58" stroke="#000" strokeWidth="5" />
        <text
          x="49"
          y="31"
          textAnchor="middle"
          fontFamily="monospace"
          fontSize="13"
          fontWeight="900"
          fill="#000"
        >
          FILTRES
        </text>
      </g>
    </svg>
  );
}

export function SessionConsoleSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 360"
      role="img"
      aria-label="Console SVG de detail session avec timer, joueurs et regles"
      className={cn("h-auto w-full", className)}
    >
      <rect width="560" height="360" fill="#fff7e8" stroke="#000" strokeWidth="6" />
      <rect x="24" y="24" width="512" height="312" fill="#151515" stroke="#000" strokeWidth="6" />
      <rect x="46" y="48" width="242" height="126" fill="#69e1ff" stroke="#000" strokeWidth="5" />
      <text x="66" y="88" fontFamily="monospace" fontSize="22" fontWeight="900" fill="#000">
        SESSION LIVE
      </text>
      <rect x="66" y="108" width="168" height="16" fill="#fff7e8" stroke="#000" strokeWidth="4" />
      <rect x="66" y="136" width="110" height="14" fill="#ffdc58" stroke="#000" strokeWidth="4" />

      <g transform="translate(330 48)">
        <rect width="160" height="126" fill="#ffdc58" stroke="#000" strokeWidth="5" />
        <circle cx="80" cy="63" r="42" fill="#fff7e8" stroke="#000" strokeWidth="6" />
        <path d="M80 26A37 37 0 0 1 116 72" fill="none" stroke="#ff4d8d" strokeWidth="10" />
        <text
          x="80"
          y="72"
          textAnchor="middle"
          fontFamily="monospace"
          fontSize="23"
          fontWeight="900"
          fill="#000"
        >
          42s
        </text>
      </g>

      <g transform="translate(46 210)">
        {["P1", "P2", "P3", "P4", "P5"].map((label, index) => (
          <g key={label} transform={`translate(${index * 92} 0)`}>
            <rect
              width="62"
              height="62"
              fill={index === 1 ? "#ff4d8d" : "#98f56c"}
              stroke="#000"
              strokeWidth="5"
            />
            <circle cx="31" cy="25" r="9" fill="#000" />
            <path d="M18 43H44" stroke="#000" strokeWidth="6" />
            <text
              x="31"
              y="88"
              textAnchor="middle"
              fontFamily="monospace"
              fontSize="14"
              fontWeight="900"
              fill="#fff7e8"
            >
              {label}
            </text>
          </g>
        ))}
      </g>
      <rect x="354" y="210" width="136" height="70" fill="#fff7e8" stroke="#000" strokeWidth="5" />
      <text x="374" y="239" fontFamily="monospace" fontSize="14" fontWeight="900" fill="#000">
        XAF
      </text>
      <text x="374" y="264" fontFamily="monospace" fontSize="24" fontWeight="900" fill="#000">
        1 000
      </text>
    </svg>
  );
}

export function WalletFlowSvg({ className }: { className?: string }) {
  const steps = [
    ["Compte", "#69e1ff"],
    ["Inscription", "#ffdc58"],
    ["Validation", "#ff4d8d"],
    ["Resultats", "#98f56c"],
  ];

  return (
    <svg
      viewBox="0 0 560 180"
      role="img"
      aria-label="Flux SVG compte inscription validation resultats"
      className={cn("h-auto w-full", className)}
    >
      <rect width="560" height="180" fill="#fff7e8" stroke="#000" strokeWidth="5" />
      {steps.map(([label, fill], index) => {
        const x = 34 + index * 128;
        return (
          <g key={label} transform={`translate(${x} 46)`}>
            <rect width="88" height="64" fill={fill} stroke="#000" strokeWidth="5" />
            <text
              x="44"
              y="39"
              textAnchor="middle"
              fontFamily="monospace"
              fontSize="11"
              fontWeight="900"
              fill="#000"
            >
              {label}
            </text>
            {index < steps.length - 1 && (
              <path d="M96 32H122" stroke="#000" strokeWidth="5" strokeLinecap="square" />
            )}
          </g>
        );
      })}
      <text
        x="280"
        y="150"
        textAnchor="middle"
        fontFamily="monospace"
        fontSize="14"
        fontWeight="900"
        fill="#000"
      >
        Parcours traçable, lisible, mobile-first
      </text>
    </svg>
  );
}
