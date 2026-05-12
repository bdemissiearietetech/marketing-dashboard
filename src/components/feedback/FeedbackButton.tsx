"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { MessageSquarePlus, Paperclip, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function FeedbackButton() {
  const t = useTranslations("feedback");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setText("");
    setImage(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setState({ kind: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setImage(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setState({ kind: "error", message: t("errors.tooLarge") });
      e.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      setState({ kind: "error", message: t("errors.notImage") });
      e.target.value = "";
      return;
    }
    setImage(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    if (state.kind === "error") setState({ kind: "idle" });
  }

  function clearImage() {
    setImage(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (text.trim().length === 0) return;

    setState({ kind: "submitting" });
    const form = new FormData();
    form.set("text", text.trim());
    form.set("pageUrl", window.location.href);
    if (image) form.set("image", image);

    try {
      const res = await fetch("/api/feedback", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        setState({ kind: "error", message: data.error ?? t("errors.generic") });
        return;
      }
      setState({ kind: "success" });
      // Auto-close after a brief confirmation.
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 1500);
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        aria-label={t("trigger")}
        render={
          <Button
            type="button"
            size="icon"
            className="fixed bottom-4 right-4 z-40 size-12 rounded-full shadow-lg"
          />
        }
      >
        <MessageSquarePlus className="size-5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("placeholder")}
            rows={6}
            required
            maxLength={10_000}
            disabled={state.kind === "submitting" || state.kind === "success"}
          />

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
              disabled={state.kind === "submitting" || state.kind === "success"}
            />
            {preview && image ? (
              <div className="flex items-center gap-2">
                <Image
                  src={preview}
                  alt={image.name}
                  width={48}
                  height={48}
                  unoptimized
                  className="size-12 rounded object-cover border"
                />
                <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {image.name}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={clearImage}
                  aria-label={t("removeImage")}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={state.kind === "submitting" || state.kind === "success"}
              >
                <Paperclip className="size-4" />
                {t("attachImage")}
              </Button>
            )}
          </div>

          {state.kind === "error" && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{state.message}</p>
          )}
          {state.kind === "success" && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">{t("success")}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={state.kind === "submitting"}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                text.trim().length === 0 ||
                state.kind === "submitting" ||
                state.kind === "success"
              }
            >
              {state.kind === "submitting" ? t("sending") : t("send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
