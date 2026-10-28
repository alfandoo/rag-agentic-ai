"use client";

import React, { ReactNode } from "react";
import { LanguageProvider } from "@/context/LanguageContext";

export const Providers: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <LanguageProvider>{children}</LanguageProvider>;
};
