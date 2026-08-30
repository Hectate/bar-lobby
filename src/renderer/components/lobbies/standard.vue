<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!-- Standard Lobby layout for team-based matches. The purpose of this component is only to hold the layout for this type.
 By doing so, the parent view (lobby.vue typically) can simply pass along relevant components to their appropriate slots. -->

<template>
    <Panel>
        <header>
            <h1>
                <slot name="header" />
            </h1>
        </header>
        <div class="main-content">
            <div class="flex-row">
                <div class="player-list">
                    <Playerlist />
                </div>
                <div class="map-preview">
                    <MapBattlePreview />
                </div>
            </div>
            <main>
                <slot name="main" />
            </main>
        </div>
    </Panel>
</template>

<script lang="ts" setup>
import Panel from "@renderer/components/common/Panel.vue";
import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";
import Playerlist from "@renderer/components/battle/Playerlist.vue";
</script>

<style scoped lang="scss">
.map-preview {
    width: 50%;
    max-height: 200px;
}
.main-content {
    display: flex;
    flex-direction: row;
    gap: 10px;
    height: 100%;
}
.player-list {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 10px;
    height: 100%;
}
</style>
