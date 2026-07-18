import { prisma } from "@/lib/prisma";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

/**
 * API Webhook endpoint to sync Clerk users with the local PostgreSQL database.
 * Listens for user.created, user.updated, and user.deleted events.
 */
export async function POST(req: Request) {
  // Get Clerk webhook secret from environment variables
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response(
      "Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local",
      { status: 500 }
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing svix headers", { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with our secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error: Could not verify webhook:", err);
    return new Response("Error: Verification failed", { status: 400 });
  }

  // Get the event type and data
  const eventType = evt.type;

  console.log(`Clerk webhook received: ${eventType}`);

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    // Get primary email
    const email = email_addresses?.[0]?.email_address;

    if (!email) {
      return new Response("Error: User has no email address", { status: 400 });
    }

    const name = [first_name, last_name].filter(Boolean).join(" ") || null;

    try {
      // Upsert the user into the database
      const user = await prisma.user.upsert({
        where: { clerkId: id },
        update: {
          email,
          name,
          imageUrl: image_url,
        },
        create: {
          clerkId: id,
          email,
          name,
          imageUrl: image_url,
        },
      });

      console.log(`Database user synchronized: ${user.id} (${eventType})`);
      return NextResponse.json({ success: true, user });
    } catch (dbErr) {
      console.error("Database sync error:", dbErr);
      return new Response("Error: Database sync failed", { status: 500 });
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    if (!id) {
      return new Response("Error: User id missing in payload", { status: 400 });
    }

    try {
      // Delete user from database
      await prisma.user.delete({
        where: { clerkId: id },
      });

      console.log(`Database user deleted: ${id}`);
      return NextResponse.json({ success: true });
    } catch (dbErr) {
      console.error("Database deletion error:", dbErr);
      return new Response("Error: Database deletion failed", { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: "Webhook processed" });
}
