import { FC, useEffect, useRef } from "react";

import { deg2rad } from "../calculation";
import { Dropzone } from "../dropzones";
import { Spot } from "./calculationAdapter";
import { useWindowSize } from "./utils";

type Props = {
    dropzone: Dropzone;
    spot: Spot;
};

const Preview: FC<Props> = ({ dropzone, spot }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const windowSize = useWindowSize();

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;

        draw(ctx, dropzone, spot).catch(err => console.error(`Preview.draw: ${err}`));
    }, [dropzone, spot, windowSize]);

    return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

export default Preview;

async function draw(ctx: CanvasRenderingContext2D, dropzone: Dropzone, spot: Spot) {
    const map = await loadImage(dropzone.mapPath);

    ctx.save();
    const { width, height } = ctx.canvas;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    // Choose a scale factor that fits the entire map on the canvas.
    const scale = Math.min(width / map.width, height / map.height);
    ctx.drawImage(
        map,
        width / 2 - (map.width / 2) * scale,
        height / 2 - (map.height / 2) * scale,
        map.width * scale,
        map.height * scale,
    );

    // Bottom left info
    ctx.fillRect(0, height - 64, 210, 64);
    ctx.moveTo(0, height - 64);
    ctx.lineTo(210, height - 64);
    ctx.lineTo(210, height);
    ctx.strokeStyle = "gray";
    ctx.stroke();
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "black";
    ctx.fillText(`${spot.secondsBetweenGroups.toFixed(0)} s between groups`, 10, height - 38);
    ctx.fillText(`Landing direction ${spot.landingDirection.toFixed(0)}°`, 10, height - 14);

    // Switch unit from mm to real-world meters, center origo, and flip the Y axis to point up.
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale / dropzone.metersPerPixel, -scale / dropzone.metersPerPixel);

    // Center X
    ctx.beginPath();
    ctx.moveTo(-24, -24);
    ctx.lineTo(24, 24);
    ctx.moveTo(24, -24);
    ctx.lineTo(-24, 24);
    ctx.lineWidth = 17;
    ctx.strokeStyle = "rgb(224, 0, 0)";
    ctx.stroke();

    // Switch coordinate system to 1 = 1 NM.
    ctx.scale(1852, 1852);

    // Deployment circle
    ctx.beginPath();
    ctx.arc(spot.deplCircle.xNm, spot.deplCircle.yNm, spot.deplCircle.radiusNm, 0, 2 * Math.PI);
    ctx.lineWidth = 0.006; // 0.006 NM ~= 11 meters
    ctx.strokeStyle = "rgb(160, 160, 160)";
    ctx.stroke();

    // Exit circle
    ctx.beginPath();
    ctx.arc(spot.exitCircle.xNm, spot.exitCircle.yNm, spot.exitCircle.radiusNm, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgb(0, 0, 0)";
    ctx.stroke();

    // Line of flight
    ctx.rotate(deg2rad(-spot.lineOfFlightDeg));
    ctx.translate(spot.offTrackNm, 0);
    ctx.beginPath();
    ctx.moveTo(0, Math.min(-1, spot.greenLightNm - 0.1));
    ctx.lineTo(0, 1.2);
    ctx.moveTo(-0.04, 1.16);
    ctx.lineTo(0, 1.2);
    ctx.lineTo(0.04, 1.16);
    ctx.stroke();

    // Green light circle
    ctx.beginPath();
    ctx.arc(0, spot.greenLightNm, 0.02, 0, 2 * Math.PI);
    ctx.lineWidth = 0.003; // 0.003 NM ~= 5.6 meters
    ctx.stroke();

    ctx.restore();
}

// Cache the previous image to avoid flicker.
let cachedUrl: string | undefined;
let cachedBitmap: ImageBitmap | undefined;

async function loadImage(url: string) {
    if (url === cachedUrl && cachedBitmap !== undefined) return cachedBitmap;
    cachedUrl = url;
    cachedBitmap = undefined;

    const response = await fetch(url);
    const bitmap = await createImageBitmap(await response.blob());
    if (url === cachedUrl) cachedBitmap = bitmap;

    return bitmap;
}
