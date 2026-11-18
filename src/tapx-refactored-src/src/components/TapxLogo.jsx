import React from 'react';

export default function TapxLogo({ className = 'w-16 h-16' }) {
  return (
    <svg
      viewBox="70 50 375 415"
      className={`${className} shrink-0 select-none`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hard Cartoon Drop Shadow */}
      <rect x="108" y="224" width="316" height="220" rx="44" fill="#111110" />

      {/* 3 Rising Chunky Cartoon Bars with Bold Outlines */}
      <rect
        x="164"
        y="144"
        width="56"
        height="116"
        rx="14"
        fill="#F26B5B"
        stroke="#111110"
        strokeWidth="10"
      />
      <rect
        x="236"
        y="106"
        width="56"
        height="154"
        rx="14"
        fill="#52B788"
        stroke="#111110"
        strokeWidth="10"
      />
      <rect
        x="308"
        y="68"
        width="56"
        height="192"
        rx="14"
        fill="#F4B942"
        stroke="#111110"
        strokeWidth="10"
      />

      {/* Main Wallet Body in Warm Sand (#D8CBB3) */}
      <rect
        x="96"
        y="212"
        width="316"
        height="216"
        rx="44"
        fill="#D8CBB3"
        stroke="#111110"
        strokeWidth="11"
      />

      {/* Wallet Clasp in Charcoal (#282825) */}
      <rect
        x="324"
        y="290"
        width="102"
        height="64"
        rx="32"
        fill="#282825"
        stroke="#111110"
        strokeWidth="10"
      />

      {/* Clasp Button Snap in Sunny Gold */}
      <circle
        cx="358"
        cy="322"
        r="13"
        fill="#F4B942"
        stroke="#111110"
        strokeWidth="7"
      />
    </svg>
  );
}
