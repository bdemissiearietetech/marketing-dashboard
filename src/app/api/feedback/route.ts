import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const MAX_TEXT_LENGTH = 10_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  if (!env.N8N_FEEDBACK_WEBHOOK_URL) {
    return NextResponse.json(
      { error: "Feedback webhook is not configured." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const text = form.get("text");
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "Text is too long." }, { status: 400 });
  }

  const image = form.get("image");
  if (image instanceof File) {
    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 5 MB)." }, { status: 400 });
    }
    if (image.size > 0 && !image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Attachment must be an image." }, { status: 400 });
    }
  }

  const pageUrl = form.get("pageUrl");

  const forward = new FormData();
  forward.set("text", text);
  if (typeof pageUrl === "string" && pageUrl.length > 0) forward.set("pageUrl", pageUrl);
  if (image instanceof File && image.size > 0) forward.set("image", image, image.name);

  try {
    const res = await fetch(env.N8N_FEEDBACK_WEBHOOK_URL, {
      method: "POST",
      body: forward,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error(
        { status: res.status, body: body.slice(0, 200) },
        "n8n feedback webhook failed",
      );
      return NextResponse.json(
        { error: `Webhook returned ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "n8n feedback webhook threw");
    return NextResponse.json(
      { error: (err as Error).message ?? "Webhook unreachable." },
      { status: 502 },
    );
  }
}
