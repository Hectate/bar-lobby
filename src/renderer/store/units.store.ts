// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { db } from "@renderer/store/db";
import { reactive } from "vue";
import { modelFiles } from "@renderer/assets/assetFiles";
import { Unit } from "@renderer/model/unit";

export const unitsStore = reactive<{
    isInitialized: boolean;
    units: Array<Unit>;
    filters: {
        faction: string;
        name: string;
    };
}>({
    isInitialized: false,
    units: [],
    filters: {
        faction: "",
        name: "",
    },
});

// Appropriate texture maps per faction
const factionTextures = {
    arm: {
        color: modelFiles["./models/arm/arm_color_blue.png"],
        normal: modelFiles["./models/arm/arm_normal.png"],
        team: modelFiles["./models/arm/arm_team.png"],
        other: modelFiles["./models/arm/arm_other_modified.png"],
    },
    cor: {
        color: modelFiles["./models/cor/cor_color.png"],
        normal: modelFiles["./models/cor/cor_normal.png"],
        team: modelFiles["./models/cor/cor_team.png"],
        other: modelFiles["./models/cor/cor_other.png"],
    },
    leg: {
        color: modelFiles["./models/leg/leg_color.png"],
        normal: modelFiles["./models/leg/leg_normal.png"],
        team: modelFiles["./models/leg/leg_team.png"],
        other: modelFiles["./models/leg/leg_other.png"],
    },
};

export function initUnitsStore() {
    if (unitsStore.isInitialized) return;

    for (const filePath in modelFiles) {
        const fileExt = filePath.split("/").pop()?.split(".")[1] || "";
        if (fileExt != "glb") continue; // Not a model file, skip it
        const unitFaction = filePath.split("/")[2]; //relies on directory structure "./model/[faction]/" to set faction
        const name = filePath.split("/").pop()?.split(".")[0] || "";
        const unit: Unit = {
            name: name,
            modelPath: modelFiles[filePath],
            faction: unitFaction as Unit["faction"],
            textureMaps: factionTextures[unitFaction],
        };
        unitsStore.units.push(unit);
    }
    //console.log(unitsStore.units);
    unitsStore.isInitialized = true;
}
