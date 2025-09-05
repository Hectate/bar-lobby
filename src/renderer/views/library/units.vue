<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Units", order: 1, devOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Select v-model="selectedUnit" :options="allUnits" :optionLabel="'name'"> </Select>
        <div class="flex flex-row flex-center-content">
            <ThreeScene></ThreeScene>
        </div>
        <Markdown
            source="
- Similar to online unit browser, but automated
- Searchable
- Sortable
- Filterable
- Paginated
"
        />
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import Markdown from "@renderer/components/misc/Markdown.vue";
import ThreeScene from "@renderer/components/three/ThreeScene.vue";
import Select from "@renderer/components/controls/Select.vue";
import { unitsStore } from "@renderer/store/units.store";

const router = useRouter();
const route = router.currentRoute.value;

const selectedUnit = ref();
const allUnits = ref(unitsStore.units);
//console.log(allUnits)
</script>

<style lang="scss" scoped></style>
