"use client";

import React from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "amber";
  subtitle?: string;
}

const colorVarMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "--badge-blue-bg", text: "--badge-blue-text", border: "--badge-blue-border" },
  green: { bg: "--badge-green-bg", text: "--badge-green-text", border: "--badge-green-border" },
  red: { bg: "--badge-red-bg", text: "--badge-red-text", border: "--badge-red-border" },
  yellow: { bg: "--badge-yellow-bg", text: "--badge-yellow-text", border: "--badge-yellow-border" },
  purple: { bg: "--badge-purple-bg", text: "--badge-purple-text", border: "--badge-purple-border" },
  amber: { bg: "--badge-amber-bg", text: "--badge-amber-text", border: "--badge-amber-border" },
};

export function StatCard({
  label,
  value,
  icon,
  color = "blue",
  subtitle,
}: StatCardProps) {
  const vars = colorVarMap[color];
  return (
    <div
      className="rounded-2xl p-5 transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor: `var(${vars.bg})`,
        color: `var(${vars.text})`,
        border: `1px solid var(${vars.border})`,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide opacity-75">{label}</p>
          <p className="text-3xl font-bold mt-1.5 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-[11px] mt-1.5 opacity-60">{subtitle}</p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg opacity-80"
          style={{ backgroundColor: `var(${vars.border})` }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
