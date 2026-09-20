/** Isolated audition player. Never changes gameplay mute, volume, or preferences. */
export class PreviewPlayer {
  private audio: HTMLAudioElement | null = null;
  private settle: ((result: "ended" | "cancelled" | "error") => void) | null =
    null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private volume = 0.35;

  setVolume(value: number) {
    this.volume = Number.isFinite(value)
      ? Math.max(0, Math.min(1, value))
      : 0.35;
    if (this.audio) this.audio.volume = this.volume;
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.onplaying = null;
      this.audio.removeAttribute("src");
      this.audio.load();
      this.audio = null;
    }
    this.settle?.("cancelled");
    this.settle = null;
  }

  play(path: string, maxSeconds = 8): Promise<"ended" | "cancelled" | "error"> {
    this.stop();
    return new Promise((resolve) => {
      const audio = new Audio(path);
      this.audio = audio;
      audio.volume = this.volume;
      audio.preload = "auto";
      this.settle = resolve;
      const finish = (result: "ended" | "error") => {
        if (this.audio !== audio) return;
        this.settle = null;
        this.stop();
        resolve(result);
      };
      audio.onended = () => finish("ended");
      audio.onerror = () => finish("error");
      // Bound long legacy clips and loading failures. No sound can loop forever.
      this.timer = setTimeout(
        () => finish("error"),
        Math.max(1, maxSeconds) * 1000 + 2000,
      );
      audio.onplaying = () => {
        if (this.audio !== audio) return;
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(
          () => finish("ended"),
          Math.max(1, maxSeconds) * 1000,
        );
      };
      try {
        void audio.play().catch(() => finish("error"));
      } catch {
        finish("error");
      }
    });
  }
}
