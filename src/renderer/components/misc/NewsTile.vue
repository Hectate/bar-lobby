<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="news-tile" :class="{ featured }" @click="openNews">
        <div class="title">{{ news.title?.replace(" ⇀ News ★ Beyond All Reason RTS", "") }}</div>
        <div class="description">
            {{ news.description }}
            <div class="cta">Click to read more</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { NewsFeedEntry } from "@main/services/news.service";
import { useImageBlobUrlCache } from "@renderer/composables/useImageBlobUrlCache";
import { ref } from "vue";

const props = defineProps<{
    news: NewsFeedEntry;
    featured?: boolean;
}>();

const { base64 } = useImageBlobUrlCache();
const newsThumbnail = props.news.thumbnailUrl;
const backgroundImageCss = newsThumbnail ? ref(`url('${base64(newsThumbnail, props.news.thumbnail || "")}')`) : ref();

const openNews = () => {
    if (props.news.link) window.shell.openInBrowser(props.news.link);
};
</script>

<style lang="scss" scoped>
.news-tile {
    height: 250px;
    width: 340px;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    position: relative;
    overflow: hidden;
    transition: 0.1s all;
    will-change: outline;

    background: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6));
    backdrop-filter: blur(10px) brightness(1) saturate(2); //doesn't support opacity transition
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    border-bottom: 1px solid rgba(124, 124, 124, 0.3);
    box-shadow:
        -1px 0 0 rgba(0, 0, 0, 0.3),
        1px 0 0 rgba(0, 0, 0, 0.3),
        0 1px 0 rgba(0, 0, 0, 0.3),
        0 -1px 0 rgba(0, 0, 0, 0.3),
        inset 0 0 50px rgba(255, 255, 255, 0.15),
        inset 0 3px 8px rgba(255, 255, 255, 0.1),
        3px 3px 10px rgba(0, 0, 0, 0.8);

    &:before {
        @extend .fullsize;
        background-image: v-bind("backgroundImageCss");
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
        transform: scale(1.1);
        transition: 0.1s all;
        // filter: saturate(0) brightness(0.8) contrast(1);
        will-change: transform, filter;
    }
    &:after {
        @extend .fullsize;
        z-index: 1;
        background: linear-gradient(rgba(0, 0, 0, 0) 70%, rgba(0, 0, 0, 0.9));
        outline: 1px solid rgba(255, 255, 255, 0.15);
        outline-offset: -1px;
        transition: 0.1s all;
    }
    &:hover,
    &.selected {
        &:before {
            transform: scale(1);
            filter: saturate(1) brightness(1.1) contrast(1.1);
        }
        outline: 1px solid rgba(255, 255, 255, 0.5);
    }

    &.featured {
        height: 100%;
        &:before {
            filter: saturate(1) brightness(1.1) contrast(1.1);
        }
    }

    // add a dark background to the text
    .title {
        font-size: 20px;
        text-align: left;
        font-weight: 500;
        z-index: 2;
        padding: 10px;
        padding-bottom: 6px;
        width: 100%;
        transition: 0.1s all;
        background: rgba(0, 0, 0, 0.8);
    }

    .description {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        opacity: 0;
        transition: 0.2s opacity;
        .cta {
            margin-top: 20px;
            color: #ffcc00;
            font-weight: 600;
            cursor: pointer;
        }
    }

    &:hover {
        .title {
            opacity: 0;
        }
        .description {
            opacity: 1;
        }
    }
}
</style>
