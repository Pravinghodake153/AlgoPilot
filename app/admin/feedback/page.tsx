import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AdminFeedbackPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/dashboard"); // Redirect non-admins
  }

  const feedbacks = await prisma.feedback.findMany({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'desc',
    }
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">User Feedback</h1>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {feedbacks.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No feedback has been submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 text-slate-300 text-sm border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Rating</th>
                    <th className="px-6 py-4 font-medium">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {feedbacks.map((fb) => (
                    <tr key={fb.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                        {new Date(fb.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">{fb.user.name || "Anonymous"}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{fb.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "w-4 h-4",
                                star <= fb.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-transparent text-slate-700"
                              )}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 min-w-[300px]">
                        <p className="whitespace-pre-wrap">{fb.comment}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
