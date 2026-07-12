import { useEffect, useRef } from "react";
import { sceneStore } from "../store/sceneStore";
import { drawScene } from "./renderer/drawScene";
import { subscribeImageLoad } from "./renderer/imageCache";

const WIDTH = 1200;
const HEIGHT = 800;

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const render = () => drawScene(ctx, sceneStore.getState(), WIDTH, HEIGHT);

    render();
    const unsubscribeScene = sceneStore.subscribe(render);
    const unsubscribeImages = subscribeImageLoad(render);

    return () => {
      unsubscribeScene();
      unsubscribeImages();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: WIDTH, height: HEIGHT }} />;
}
