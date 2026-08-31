import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";

/* Singleton loader model MediaPipe — model & wasm dimuat dari CDN,
   inferensi berjalan 100% di perangkat pengguna (offline-friendly setelah cache). */

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

export const MODEL_URLS = {
  hand: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  pose: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  face: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
} as const;

let fileset: Promise<any> | null = null;
const fs = () => (fileset ??= FilesetResolver.forVisionTasks(WASM_BASE));

async function withFallback<T>(make: (delegate: "GPU" | "CPU") => Promise<T>): Promise<T> {
  try {
    return await make("GPU");
  } catch {
    return await make("CPU");
  }
}

let hand: Promise<HandLandmarker> | null = null;
export const getHandLandmarker = () =>
  (hand ??= withFallback((delegate) =>
    fs().then((vision) =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URLS.hand, delegate },
        runningMode: "VIDEO",
        numHands: 1,
      })
    )
  ));

let pose: Promise<PoseLandmarker> | null = null;
export const getPoseLandmarker = () =>
  (pose ??= withFallback((delegate) =>
    fs().then((vision) =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URLS.pose, delegate },
        runningMode: "VIDEO",
        numPoses: 1,
      })
    )
  ));

let face: Promise<FaceLandmarker> | null = null;
export const getFaceLandmarker = () =>
  (face ??= withFallback((delegate) =>
    fs().then((vision) =>
      FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URLS.face, delegate },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
      })
    )
  ));

/* ---------- geometri & koneksi ---------- */

export interface NL {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** petakan koordinat ternormalisasi (x dicerminkan) ke piksel canvas mode 'cover' */
export function coverMapper(vw: number, vh: number, cw: number, ch: number) {
  const s = Math.max(cw / vw, ch / vh);
  const ox = (cw - vw * s) / 2;
  const oy = (ch - vh * s) / 2;
  return (nx: number, ny: number) => ({ x: ox + (1 - nx) * vw * s, y: oy + ny * vh * s });
}

export const dist = (a: NL, b: NL) => Math.hypot(a.x - b.x, a.y - b.y);

export const HAND_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export const POSE_EDGES: [number, number][] = [
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [15, 17], [17, 19], [19, 21],
  [16, 18], [18, 20], [20, 22],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [29, 31],
  [24, 26], [26, 28], [28, 30], [30, 32],
];

/** garis luar wajah (ringkas) untuk wireframe */
export const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109,
];
export const LIPS_OUTER = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84,
  181, 91, 146,
];
