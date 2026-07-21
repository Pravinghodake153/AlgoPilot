"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { FeedbackModal } from "./feedback-modal";
import { Button } from "@/components/ui/button";

import { useAuth } from "@clerk/nextjs";

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn } = useAuth();

  if (!isSignedIn) return null;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full shadow-lg h-14 px-6 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 z-50 transition-all hover:scale-105"
      >
        <MessageSquarePlus className="w-5 h-5" />
        <span className="font-medium hidden sm:inline">Feedback</span>
      </Button>
      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
