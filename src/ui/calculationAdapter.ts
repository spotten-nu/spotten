import { deg2rad, ft2m, Input, kt2mps, m2nm, nm2m, rad2deg, SpotCalculator } from "../calculation";
import { InputPanelState } from "./inputPanel";

// All code in the calculation directory uses metric units. This functions does the conversion.
export function calculateSpot(input: InputPanelState): Spot {
    const metricInput: Input = {
        winds: [
            {
                altitude: ft2m(10_000),
                speed: kt2mps(input.windFL100.speedKt),
                direction: deg2rad(input.windFL100.directionDeg),
            },
            {
                altitude: ft2m(5_000),
                speed: kt2mps(input.windFL50.speedKt),
                direction: deg2rad(input.windFL50.directionDeg),
            },
            {
                altitude: ft2m(2_000),
                speed: kt2mps(input.wind2000ft.speedKt),
                direction: deg2rad(input.wind2000ft.directionDeg),
            },
            {
                altitude: 0,
                speed: kt2mps(input.windGround.speedKt),
                direction: deg2rad(input.windGround.directionDeg),
            },
        ],
        fixedLineOfFlight: deg2rad(input.fixedLineOfFlightDeg),
        fixedOffTrack: nm2m(input.fixedOffTrackNm),
        fixedLandingDirections: input.dropzone.fixedLandingDirections?.map(x => deg2rad(x)),
    };

    const metricOutput = new SpotCalculator(metricInput).calculate();

    return {
        lineOfFlightDeg: metricOutput.lineOfFlight === 0 ? 360 : rad2deg(metricOutput.lineOfFlight),
        offTrackNm: m2nm(metricOutput.offTrack),
        greenLightNm: input.fixedGreenLightNm ?? m2nm(metricOutput.greenLight),
        deplCircle: {
            xNm: m2nm(metricOutput.deplCircle.x),
            yNm: m2nm(metricOutput.deplCircle.y),
            radiusNm: m2nm(metricOutput.deplCircle.radius),
        },
        exitCircle: {
            xNm: m2nm(metricOutput.exitCircle.x),
            yNm: m2nm(metricOutput.exitCircle.y),
            radiusNm: m2nm(metricOutput.exitCircle.radius),
        },
        redLight: {
            bearingDeg: rad2deg(metricOutput.redLight.bearing),
            distanceNm: m2nm(metricOutput.redLight.distance),
        },
        secondsBetweenGroups: metricOutput.timeBetweenGroups,
        landingDirection:
            metricOutput.landingDirection === 0 ? 360 : rad2deg(metricOutput.landingDirection),
    };
}

export type Spot = {
    lineOfFlightDeg: number;
    offTrackNm: number;
    greenLightNm: number;
    deplCircle: Circle;
    exitCircle: Circle;
    redLight: { bearingDeg: number; distanceNm: number };
    secondsBetweenGroups: number;
    landingDirection: number;
};

export type Circle = {
    xNm: number;
    yNm: number;
    radiusNm: number;
};
