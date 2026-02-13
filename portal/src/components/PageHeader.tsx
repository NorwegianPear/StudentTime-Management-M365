"use client";

import React from "react";
import { TopBar } from "@/components/TopBar";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {/* Title row with toggles */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold theme-text-primary tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="theme-text-secondary mt-0.5 text-sm">{subtitle}</p>
          )}
        </div>
        <div className="shrink-0 ml-4">
          <TopBar />
        </div>
      </div>
      {/* Actions row */}
      {actions && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
