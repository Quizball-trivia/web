"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { GAMES } from "./registry";
import { isPlaygroundMessage, PLAYGROUND, type PreviewPayload, type ToPreview } from "./protocol";

const post = (message: PreviewPayload) => window.parent?.postMessage({ source: PLAYGROUND, ...message }, window.location.origin);

class Boundary extends Component<{ children: ReactNode; resetKey: string }, { error: string | null; key: string }> {
  state = { error: null as string | null, key: this.props.resetKey };
  static getDerivedStateFromProps(props: { resetKey: string }, state: { key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }
  componentDidCatch(error: Error) {
    this.setState({ error: error.message });
    post({ type: "error", message: error.message });
  }
  render() {
    return this.state.error ? <p className="m-4 rounded-xl bg-brand-red-soft/20 p-4 text-sm text-white">{this.state.error}</p> : this.props.children;
  }
}

/** The iframe page: renders exactly one scenario (the real component) at the device's real viewport. */
export function PreviewHost() {
  const [frame, setFrame] = useState<ToPreview | null>(null);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isPlaygroundMessage(event)) return;
      const message = event.data as ToPreview | { type: "hello" };
      if (message.type === "hello") post({ type: "ready" });
      else if (message.type === "render") setFrame(message);
    };
    window.addEventListener("message", onMessage);
    // Said on mount and again whenever the parent asks: either side may load first.
    post({ type: "ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!frame) return <div className="min-h-dvh bg-surface-page-alt" />;
  // The key remounts the screen on Reset and on every scenario switch: no draft, copied state or image failure carries over.
  return (
    <Boundary resetKey={`${frame.key}@${frame.applied}`}>
      <ScenarioView key={frame.key} frame={frame} />
    </Boundary>
  );
}

/** Renders inside the boundary, so a state the component cannot take shows an error instead of unmounting the preview. */
function ScenarioView({ frame }: { frame: ToPreview }) {
  const scenario = GAMES.find((g) => g.id === frame.game)?.scenarios[frame.mode]?.find((s) => s.id === frame.scenario);
  if (!scenario) return <p className="p-4 text-sm text-white">Unknown scenario</p>;
  const content = scenario.render(frame.data as never, { locale: frame.locale, log: (action, ...args) => post({ type: "action", action, args }) });
  return <>{content}</>;
}
