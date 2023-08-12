import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import PrintIcon from "@mui/icons-material/Print";
import SettingsIcon from "@mui/icons-material/Settings";
import { Fab } from "@mui/material";
import { FC, useState } from "react";

import dropzones from "../dropzones";
import { calculateSpot, Spot } from "./calculationAdapter";
import InputPanel, { InputPanelState } from "./inputPanel";
import { renderAsBlob } from "./pdfGenerator";
import Preview from "./preview";
import { useLocalStorage } from "./utils";

const App: FC = () => {
    const [input, setInput] = useLocalStorage("input", deserializeInput, serializeInput);
    const [inputVisible, setInputVisible] = useState(true);

    const spot = calculateSpot(input);

    return (
        <>
            <Preview dropzone={input.dropzone} spot={spot} />

            {inputVisible && (
                <InputPanel
                    dropzones={dropzones}
                    value={input}
                    onChange={x => setInput(x)}
                    onClose={() => setInputVisible(false)}
                    spot={spot}
                    sx={{ position: "absolute", top: 10, left: 10 }}
                />
            )}

            <Fab
                color="primary"
                title="Edit"
                sx={{ position: "absolute", bottom: 245, right: 20 }}
                onClick={() => setInputVisible(!inputVisible)}
            >
                <EditIcon />
            </Fab>
            <Fab
                color="primary"
                title="Print"
                sx={{ position: "absolute", bottom: 170, right: 20 }}
                onClick={() => void print(input, spot).catch(console.error)}
            >
                <PrintIcon />
            </Fab>
            <Fab
                color="primary"
                title="History"
                sx={{ position: "absolute", bottom: 95, right: 20 }}
                onClick={() => alert("TODO: Show history")}
            >
                <HistoryIcon />
            </Fab>
            <Fab
                color="primary"
                title="Settings"
                sx={{ position: "absolute", bottom: 20, right: 20 }}
                onClick={() => alert("TODO: Show settings")}
            >
                <SettingsIcon />
            </Fab>
        </>
    );
};

type SerializedInput = Omit<InputPanelState, "dropzone"> & { dropzone: string };

function serializeInput(input: InputPanelState) {
    const jsonData: SerializedInput = { ...input, dropzone: input.dropzone.name };
    return JSON.stringify(jsonData);
}

function deserializeInput(str: string | undefined): InputPanelState {
    const input = JSON.parse(str ?? "{}") as Partial<SerializedInput>;
    return {
        dropzone: dropzones.find(dz => dz.name === input.dropzone) ?? dropzones[0],
        windFL100: input.windFL100 ?? { directionDeg: 360, speedKt: 0 },
        windFL50: input.windFL50 ?? { directionDeg: 360, speedKt: 0 },
        wind2000ft: input.wind2000ft ?? { directionDeg: 360, speedKt: 0 },
        windGround: input.windGround ?? { directionDeg: 360, speedKt: 0 },
        fixedLineOfFlightDeg: input.fixedLineOfFlightDeg,
        fixedOffTrackNm: input.fixedOffTrackNm,
        fixedGreenLightNm: input.fixedGreenLightNm,
    };
}

async function print(input: InputPanelState, spot: Spot) {
    const pdfBlob = await renderAsBlob(input, spot);

    const wnd = window.open(URL.createObjectURL(pdfBlob));
    if (!wnd) return;
    wnd.onload = () => {
        wnd.focus();
        wnd.print();
    };
}

export default App;
