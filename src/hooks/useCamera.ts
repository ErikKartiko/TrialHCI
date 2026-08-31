import { useCallback, useEffect, useRef, useState } from "react";

export type CamState = "idle" | "loading" | "on" | "denied" | "error" | "nosupport";

export function useCamera(facing: "user" | "environment" = "user") {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CamState>("idle");

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("nosupport");
      return;
    }
    setState("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        v.setAttribute("playsinline", "true");
        await v.play();
      }
      setState("on");
    } catch (e: any) {
      const name = e?.name ?? "";
      setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
    }
  }, [facing]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState("idle");
  }, []);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    },
    []
  );

  return { videoRef, streamRef, state, start, stop };
}
