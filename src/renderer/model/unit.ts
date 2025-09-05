// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export type Unit = {
    name: string;
    modelPath: string;
    faction: "arm" | "cor" | "leg";
    textureMaps: {
        color: string;
        normal: string;
        team: string;
        other: string;
    };
    // Descriptive text translation strings should be here too
};
