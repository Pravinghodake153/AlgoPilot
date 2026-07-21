"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (!comment.trim()) {
      toast.error("Please provide some feedback");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });

      if (!res.ok) throw new Error("Failed to submit feedback");
      
      toast.success("Thank you for your feedback!");
      setRating(0);
      setComment("");
      onClose();
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Leave Feedback</DialogTitle>
          <DialogDescription className="text-slate-400">
            Let us know what you think of AlgoPilot! Your feedback helps us improve.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-slate-300">How would you rate your experience?</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-8 h-8 transition-colors",
                      (hoverRating ? star <= hoverRating : star <= rating)
                        ? "fill-amber-400 text-amber-400"
                        : "fill-transparent text-slate-600 hover:text-slate-500"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder={
                rating === 0
                  ? "Select a rating first..."
                  : rating >= 4
                  ? "What did you love about this interview?"
                  : "What could we improve?"
              }
              disabled={rating === 0}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[120px] bg-slate-800 border-slate-700 resize-none text-white focus-visible:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || rating === 0 || !comment.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
