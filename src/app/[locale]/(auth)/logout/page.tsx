"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

import { MosaicLogo } from "@/components/icons";

export default function LogoutPage() {
  useEffect(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)]">
      <MosaicLogo className="mb-8 h-20" />
    </div>
  );
}
