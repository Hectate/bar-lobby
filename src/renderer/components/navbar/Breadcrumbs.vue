<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="breadcrumbs">
        <div class="item back" @click="onBack">
            <Icon :icon="chevronLeft" height="21" />
            <div>{{ t("lobby.navbar.breadcrumbs.back") }}</div>
        </div>
        <template v-for="item in currentRoute.matched" :key="item.path">
            <div v-if="item.children" class="separator">/</div>
            <router-link class="item" :class="{ active: item.path === currentRoute.path }" :to="item.path">
                {{ item.meta.title ?? item.name }}
            </router-link>
        </template>
    </div>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import chevronLeft from "@iconify-icons/mdi/chevron-left";
import { useRouter } from "vue-router";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const router = useRouter();
const currentRoute = router.currentRoute;

function onBack() {
    router.back();
}
</script>

<style lang="scss" scoped>
.breadcrumbs {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding-right: 10px;
    padding-bottom: 3px;
    transition: 0.4s opacity;
    &.hidden {
        opacity: 0;
    }
}
.item {
    padding: 5px 10px;
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    font-size: 16px;
    &:hover,
    &.active {
        color: #fff;
    }
}
.back {
    padding: 5px 5px;
}
.separator {
    color: rgba(255, 255, 255, 0.5);
}
</style>
