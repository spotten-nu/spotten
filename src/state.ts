import dropzones from "./dropzones";

export type Wind = { direction: number; speed: number };
export type AppState = typeof initialState;
export type Winds = typeof initialState["winds"];
export type FixedParams = typeof initialState["fixedParams"];
export type Config = typeof initialState["config"];

export const initialState = {
  dropzone: dropzones[0],
  winds: {
    fl100: undefined as undefined | Wind,
    "2000ft": undefined as undefined | Wind,
    ground: undefined as undefined | Wind,
  },
  fixedParams: {
    landingDirection: undefined as undefined | number,
    lineOfFlight: undefined as undefined | number,
    offTrack: undefined as undefined | number,
    distance: undefined as undefined | number,
  },
  config: {
    exitAltitude: 4000,
    deplAltitude: 700,
    finalAltitude: 100,
    jumpRunTAS: 45,
    redLightTime: 120,
    greenLightTime: 10,
    horizontalCanopySpeed: 9,
    verticalCanopySpeed: 4,
    metersBetweenGroups: 250,
    minTimeBetweenGroups: 5,
  },
};

export type Action =
  | { type: "dropzone"; id: string }
  | { type: "winds"; winds: Winds }
  | { type: "fixedParams"; fixedParams: FixedParams }
  | { type: "config"; config: Config };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "dropzone":
      const dropzone = dropzones.find((d) => d.id === action.id);
      return {
        ...state,
        fixedParams: initialState.fixedParams,
        dropzone: dropzone ?? state.dropzone,
      };

    case "winds":
      return {
        ...state,
        winds: action.winds,
      };

    case "fixedParams":
      return {
        ...state,
        fixedParams: action.fixedParams,
      };

    case "config":
      return {
        ...state,
        config: action.config,
      };
  }
}
