"use client";

import React from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "amber";
  subtitle?: string;
}

const colorMap = {
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  green: "bg-green-50 border-green-200 text-green-700",
  red: "bg-red-50 border-red-200 text-red-700",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
  purple: "bg-purple-50 border-purple-200 text-purple-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700",
};

const iconColorMap = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  red: "bg-red-100 text-red-600",
  yellow: "bg-yellow-100 text-yellow-600",
  purple: "bg-purple-100 text-purple-600",
  amber: "bg-amber-100 text-amber-600",
};

export function StatCard({
  label,
  value,
  icon,
  color = "blue",
  subtitle,
}: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-6 ${colorMap[color]} transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs mt-1 opacity-60">{subtitle}</p>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-lg ${iconColorMap[color]} flex items-center justify-center text-xl`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
