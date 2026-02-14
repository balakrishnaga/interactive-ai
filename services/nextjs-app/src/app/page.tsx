"use client";

import { useEffect } from "react";
import ChatBox from "@/components/ChatBox";

export default function Home() {
  useEffect(() => {
    // Clear MongoDB vectors on page load/refresh
    fetch("/api/documents/clear", { method: "POST" })
      .then(res => res.json())
      .then(data => console.log("Init clean-up:", data.message))
      .catch(err => console.error("Initial clean-up failed:", err));
  }, []);

  return (
    <main>
      <ChatBox />
    </main>
  );
}