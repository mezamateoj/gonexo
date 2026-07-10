import confetti, { type CreateTypes } from "canvas-confetti"

// A single worker-backed confetti instance, created lazily and reused. Running
// the animation on a Web Worker (OffscreenCanvas) keeps it smooth while the
// main thread is busy — the default confetti() animates on the main thread and
// visibly stutters during the query refetch + route change that fire alongside
// the celebration (accept quote / confirm delivery / confirm reception).
let instance: CreateTypes | null = null

function getInstance(): CreateTypes {
  if (instance) return instance

  const canvas = document.createElement("canvas")
  canvas.setAttribute("aria-hidden", "true")
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "100",
  })
  document.body.appendChild(canvas)

  instance = confetti.create(canvas, { resize: true, useWorker: true })
  return instance
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

// Spin up the worker and transfer the OffscreenCanvas ahead of time. That
// one-time cost otherwise lands on the very first fireConfetti() — which runs
// while the celebration dialog is mounting and queries are refetching — and
// shows up as a hitch. Warming during idle moves it off the peak moment.
let warmed = false
export function warmConfetti() {
  if (warmed || typeof window === "undefined" || prefersReducedMotion()) return
  warmed = true
  const idle =
    window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200))
  idle(() => {
    // A zero-particle burst forces worker init + canvas transfer without
    // drawing anything.
    void getInstance()({ particleCount: 0, ticks: 0 })
  })
}

// Two-origin burst for the "peak" moments (flete reservado / entregado /
// completado). Bails before touching the worker when the user asked for
// reduced motion.
export function fireConfetti() {
  if (prefersReducedMotion()) return

  const fire = getInstance()
  const base = {
    spread: 68,
    startVelocity: 42,
    ticks: 200,
    gravity: 0.9,
    scalar: 0.9,
    disableForReducedMotion: true,
  } as const

  // Defer past the current React commit so the burst doesn't compete for the
  // main thread with the dialog mount / sheet close and the post-mutation
  // refetch happening in the same frame.
  requestAnimationFrame(() => {
    void fire({ ...base, particleCount: 55, angle: 65, origin: { x: 0.15, y: 0.75 } })
    void fire({ ...base, particleCount: 55, angle: 115, origin: { x: 0.85, y: 0.75 } })
  })
}
