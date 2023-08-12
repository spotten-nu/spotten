import blobStream from "blob-stream";
import PDFDocument from "pdfkit";

import { kt2mps, nm2m } from "../calculation/utils";
import { Spot } from "./calculationAdapter";
import { InputPanelState } from "./inputPanel";
import { Wind } from "./windInput";

export async function renderAsBlob(input: InputPanelState, spot: Spot) {
    const mapResponse = await fetch(input.dropzone.mapPath);
    const imageData = await mapResponse.arrayBuffer();

    const stream = blobStream();
    new PdfGenerator(input, spot, imageData, stream);
    return new Promise<Blob>(resolve =>
        stream.on("finish", () => resolve(stream.toBlob("application/pdf"))),
    );
}

class PdfGenerator {
    private readonly mapScale = 1 / 25000;
    private readonly doc: PDFKit.PDFDocument;
    private readonly width: number;
    private readonly height: number;
    private pilotInfoWidth = 0;
    private pilotInfoHeight = 0;
    private windInfoWidth = 0;
    private windInfoHeight = 0;
    private jumperInfoWidth = 0;
    private jumperInfoHeight = 0;
    private footerWidth = 0;
    private footerHeight = 0;

    public constructor(
        private readonly input: InputPanelState,
        private readonly spot: Spot,
        private readonly imageData: ArrayBuffer,
        stream: NodeJS.WritableStream,
    ) {
        const margin = 6;
        this.doc = new PDFDocument({
            size: "a4",
            layout: "landscape",
            margin: (margin / 25.4) * 72,
            info: { Title: "Spot" },
        });
        this.doc.pipe(stream);

        // Set mm as unit and add the margin.
        this.doc.scale(72 / 25.4).translate(margin, margin);
        this.width = 297 - 2 * margin;
        this.height = 210 - 2 * margin;

        this.renderPilotInfo();
        this.renderWinds();
        this.renderJumperInfo();
        this.renderFooter();
        this.renderMap();

        this.doc.end();
    }

    private renderPilotInfo() {
        const {
            lineOfFlightDeg,
            offTrackNm,
            greenLightNm,
            redLight: { bearingDeg: redBearing, distanceNm: redDistance },
        } = this.spot;

        // Line of flight and distance.
        const greenLightStr = (greenLightNm > 0 ? "+" : "") + greenLightNm.toFixed(1);
        const line1 = `Green light ${angleStr(lineOfFlightDeg)}  ${greenLightStr} NM`;
        this.doc.fontSize(6).text(line1, 0, 0);
        const line1Width = this.doc.widthOfString(line1);

        // Off track
        if (offTrackNm !== 0) {
            const side = offTrackNm > 0 ? "Right" : "Left";
            this.doc.text(`${side} off track  ${Math.abs(offTrackNm).toFixed(1)} NM`);
        }

        // Red light
        this.doc
            .fontSize(3)
            .text(`Red light:  ${angleStr(redBearing)}  ${redDistance.toFixed(1)} NM`);

        this.pilotInfoWidth = line1Width + 0.5;
        this.pilotInfoHeight = this.doc.y;
    }

    private renderWinds() {
        this.doc.save();
        this.doc.fontSize(3);
        this.doc.translate(0, this.height - 90);
        this.renderOneWind(this.input.windFL100, "FL100");
        this.doc.translate(0, 30);
        this.renderOneWind(this.input.wind2000ft, "2000 ft");
        this.doc.translate(0, 30);
        this.renderOneWind(this.input.windGround, "Ground");
        this.doc.restore();

        this.windInfoHeight = 88.5;
        this.windInfoWidth = 21;
    }

    private renderOneWind({ speedKt, directionDeg }: Wind, altitudeDescr: string) {
        this.doc.fontSize(3);
        this.doc.text(altitudeDescr, 0, 2.5, { width: 20, align: "center" });
        this.doc.text(`${directionDeg.toFixed(0)}° / ${speedKt.toFixed(0)} kt`, {
            width: 20,
            align: "center",
        });

        this.doc.save().translate(10.5, 19.5);

        // Gray circle with tick marks
        this.doc.circle(0, 0, 10).lineWidth(0.3).stroke("#d0d0d0");
        for (let i = 0; i < 8; i++) {
            this.doc.rotate(45).moveTo(0, 10).lineTo(0, 8.5).stroke();
        }

        // Numeric wind speed
        const mps = kt2mps(speedKt);
        this.doc.fontSize(4).text(mps.toFixed(0), -5, -1.5, { width: 10, align: "center" });

        // Wind arrow
        if (mps >= 0.5) {
            this.doc
                .rotate(directionDeg)
                .moveTo(0, -9.5)
                .lineTo(0, -3.5)
                .lineWidth(1)
                .stroke("black")
                .moveTo(0, -2.5)
                .lineTo(-1.6, -5)
                .lineTo(1.6, -5)
                .closePath()
                .fill("black");
        }
        this.doc.restore();
    }

    private renderJumperInfo() {
        this.doc.fontSize(5);
        const text = `${this.spot.secondsBetweenGroups} seconds between groups`;
        this.jumperInfoWidth = this.doc.widthOfString(text) + 1;
        this.jumperInfoHeight = this.doc.heightOfString(text);

        this.doc.text(text, this.windInfoWidth + 0.3, this.height - this.jumperInfoHeight + 1);
    }

    private renderFooter() {
        const time = Intl.DateTimeFormat("sv-SE", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
        }).format(new Date());
        const fullText = `${time}     spotten.nu     Map: © OpenStreetMap contributors`;
        this.doc.fontSize(3);
        const w = this.doc.widthOfString(fullText);
        const h = this.doc.heightOfString(fullText);
        this.doc
            .text(time + "     ", this.width - w - 0.3, this.height - h + 0.7, { continued: true })
            .text("spotten.nu", { link: "https://spotten.nu/", continued: true })
            .text("     Map: © ", { link: null, continued: true })
            .text("OpenStreetMap", {
                link: "https://www.openstreetmap.org/copyright",
                continued: true,
            })
            .text(" contributors", { link: null });
        this.footerWidth = w + 1;
        this.footerHeight = h;
    }

    private renderMap() {
        this.doc.save();
        this.traceOutline();
        this.doc.clip();

        const map = this.input.dropzone;
        const dz = { x: map.width / 2, y: map.height / 2 }; // DZ must be in the center of the map.
        this.doc
            .save()
            .translate(this.width / 2, this.height / 2)
            .scale(1000 * this.mapScale)
            .image(this.imageData, -dz.x * map.metersPerPixel, -dz.y * map.metersPerPixel, {
                width: map.width * map.metersPerPixel,
                height: map.height * map.metersPerPixel,
            })
            .restore();
        this.renderSpot();
        this.renderScale();
        this.traceOutline();
        this.doc.lineWidth(0.25).stroke("#e0e0e0");
        this.doc.restore();
    }

    private traceOutline() {
        this.doc
            .moveTo(this.pilotInfoWidth, 0)
            .lineTo(this.width, 0)
            .lineTo(this.width, this.height - this.footerHeight)
            .lineTo(this.width - this.footerWidth, this.height - this.footerHeight)
            .lineTo(this.width - this.footerWidth, this.height)
            .lineTo(this.windInfoWidth + this.jumperInfoWidth, this.height)
            .lineTo(this.windInfoWidth + this.jumperInfoWidth, this.height - this.jumperInfoHeight)
            .lineTo(this.windInfoWidth, this.height - this.jumperInfoHeight)
            .lineTo(this.windInfoWidth, this.height - this.windInfoHeight)
            .lineTo(0, this.height - this.windInfoHeight)
            .lineTo(0, this.pilotInfoHeight)
            .lineTo(this.pilotInfoWidth, this.pilotInfoHeight)
            .closePath();
    }

    private renderSpot() {
        // Switch unit from mm to m, move origo to the DZ and flip the Y axis to point up.
        this.doc
            .save()
            .translate(this.width / 2, this.height / 2)
            .scale(1000 * this.mapScale, -1000 * this.mapScale);

        // Draw the DZ cross
        this.doc
            .moveTo(-24, -24)
            .lineTo(24, 24)
            .moveTo(24, -24)
            .lineTo(-24, 24)
            .lineWidth(16)
            .stroke();

        // Switch unit from m to NM.
        this.doc.scale(1852, 1852);

        // Draw the circles
        this.doc
            .lineWidth(0.006) // 0.006 NM ~= 11 meters
            .circle(
                this.spot.deplCircle.xNm,
                this.spot.deplCircle.yNm,
                this.spot.deplCircle.radiusNm,
            )
            .stroke("#a0a0a0")
            .circle(
                this.spot.exitCircle.xNm,
                this.spot.exitCircle.yNm,
                this.spot.exitCircle.radiusNm,
            )
            .stroke("black");

        // Draw the arrow and green light circle
        this.doc
            .rotate(-this.spot.lineOfFlightDeg)
            .translate(this.spot.offTrackNm, 0)
            .moveTo(0, -1.1)
            .lineTo(0, 1.1)
            .moveTo(-0.05, 1.05)
            .lineTo(0, 1.1)
            .lineTo(0.05, 1.05)
            .lineWidth(0.012) // 0.012 NM ~= 22 meters
            .stroke()
            .circle(0, this.spot.greenLightNm, 0.024) // 0.024 NM ~= 44 meters
            .lineWidth(0.006) // 0.006 NM ~= 11 meters
            .stroke();

        this.doc.restore();
    }

    private renderScale() {
        const numFmt = Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
        const denominator = numFmt.format(1 / this.mapScale);
        this.doc
            .save()
            .translate(this.width, this.height - this.footerHeight)
            .scale(1000 * this.mapScale)
            .translate(-1120, -150);

        // Tick marks
        this.doc
            .moveTo(0, 0)
            .lineTo(1000, 0)
            .moveTo(0, -50)
            .lineTo(0, 50)
            .moveTo(100, -30)
            .lineTo(100, 0)
            .moveTo(200, -30)
            .lineTo(200, 0)
            .moveTo(300, -30)
            .lineTo(300, 0)
            .moveTo(400, -30)
            .lineTo(400, 0)
            .moveTo(500, -50)
            .lineTo(500, 0)
            .moveTo(1000, -50)
            .lineTo(1000, 0)
            .moveTo(nm2m(0.1), 30)
            .lineTo(nm2m(0.1), 0)
            .moveTo(nm2m(0.2), 30)
            .lineTo(nm2m(0.2), 0)
            .moveTo(nm2m(0.3), 30)
            .lineTo(nm2m(0.3), 0)
            .moveTo(nm2m(0.4), 30)
            .lineTo(nm2m(0.4), 0)
            .moveTo(nm2m(0.5), 50)
            .lineTo(nm2m(0.5), 0)
            .lineWidth(8)
            .stroke("black");
        // Labels
        this.doc
            .fontSize(70)
            .text("500 m", 500 - 200, -110, { width: 400, align: "center" })
            .text("1 km", 1000 - 200, -110, { width: 400, align: "center" })
            .text("0.5 NM", nm2m(0.5) - 200, 60, { width: 400, align: "center" });
        // Scale
        this.doc.text(`1 : ${denominator}`, -500, -20, { align: "right", width: 460 });
        this.doc.restore();
    }
}

function angleStr(deg: number) {
    deg = Math.round(deg);
    if (deg <= 0) deg += 360; // North is "360" - not "000".
    return `00${deg}`.slice(-3) + "°";
}
