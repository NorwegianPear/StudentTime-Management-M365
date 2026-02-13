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
    <div className="flex items-start justify-between mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold theme-text-primary tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="theme-text-secondary mt-1 text-sm">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {actions}
        <TopBar />
      </div>
    </div>
  );
}
