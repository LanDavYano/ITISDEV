"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DeadlineRoutePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin?tab=deadline");
  }, [router]);

  return null;
}

