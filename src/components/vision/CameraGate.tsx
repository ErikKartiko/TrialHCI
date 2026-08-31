import type { ReactNode } from "react";
import { Camera, CameraOff, Loader2, ShieldCheck } from "lucide-react";
import { LabButton } from "../ui";
import type { CamState } from "../../hooks/useCamera";

/** Layar Status di dalam stage: meminta izin kamera / menampilkan masalah */
export default function CameraGate({
  state,
  onStart,
  title,
  desc,
  extra,
}: {
  state: CamState;
  onStart: () => void;
  title: string;
  desc: string;
  extra?: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-ink/70 backdrop-blur-[6px]">
      <div className="flex max-w-sm flex-col items-center gap-4 px-6 text-center">
        {state === "loading" ? (
          <>
            <Loader2 className="size-8 animate-spin text-cyan" />
            <p className="font-mono text-xs tracking-[0.25em] text-paper">MEMBUKA KAMERA & MEMUAT MODEL AI…</p>
            <p className="text-[11px] leading-relaxed text-muted">model visi diunduh sekali (~10MB) lalu berjalan sepenuhnya di perangkatmu</p>
          </>
        ) : state === "denied" || state === "error" || state === "nosupport" ? (
          <>
            <span className="grid size-14 place-items-center rounded-2xl border border-magenta/40 bg-magenta/10 text-magenta">
              <CameraOff className="size-6" />
            </span>
            <p className="font-mono text-xs tracking-[0.25em] text-magenta">
              {state === "denied" ? "IZIN KAMERA DITOLAK" : state === "nosupport" ? "KAMERA TIDAK TERSEDIA" : "GAGAL MEMBUKA KAMERA"}
            </p>
            <p className="text-[11px] leading-relaxed text-muted">
              {state === "denied"
                ? "klik ikon kunci/kamera di bilah alamat browser, izinkan kamera, lalu coba lagi."
                : "pastikan perangkat punya kamera dan browser mengizinkan akses (https/localhost)."}
            </p>
            <LabButton onClick={onStart}>COBA LAGI</LabButton>
          </>
        ) : (
          <>
            <span className="grid size-14 place-items-center rounded-2xl border border-cyan/40 bg-cyan/10 text-cyan">
              <Camera className="size-6" />
            </span>
            <p className="font-mono text-xs tracking-[0.25em] text-paper">{title}</p>
            <p className="text-[11px] leading-relaxed text-muted">{desc}</p>
            <LabButton active onClick={onStart}>
              <Camera className="size-3.5" /> NYALAKAN KAMERA
            </LabButton>
            <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-lime/80">
              <ShieldCheck className="size-3" /> 100% DIPROSES LOKAL — VIDEO TAK PERNAH DIKIRIM
            </p>
            {extra}
          </>
        )}
      </div>
    </div>
  );
}
