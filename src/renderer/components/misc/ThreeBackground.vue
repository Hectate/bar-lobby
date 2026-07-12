<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="fullsize background">
        <div ref="scene_container" class="background__overlay"></div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { unitsStore } from "@renderer/store/units.store";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CubeTextureLoader } from "three";
import { modelFiles } from "@renderer/assets/assetFiles";

enum SceneStates {
    LOGIN = "LOGIN",
    MENU = "MENU",
}

const route = useRoute();
watch(
    () => route.path,
    (newPath) => {
        console.log(`new path: ${newPath}`);
        if (newPath === "/") {
            updateScene(SceneStates.LOGIN);
        } else if (newPath.startsWith("/play")) {
            updateScene(SceneStates.MENU);
        }
    }
);

const scene_container = ref();
const gltfLoader = new GLTFLoader();
const cubeTextureLoader = new CubeTextureLoader();

import * as THREE from "three";

let pivot: THREE.Group;
let renderer, marsModel;
let camera: THREE.Camera;
let scene: THREE.Scene;

const cameraTargetPosition = new THREE.Vector3(0, 2, 2);
const LERP_FACTOR = 0.01;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    const universalLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(universalLight);

    cubeTextureLoader
        // .setPath(`./renderer/assets/models/others/`)
        .loadAsync([
            modelFiles[`./models/others/right.png`],
            modelFiles[`./models/others/left.png`],
            modelFiles[`./models/others/top.png`],
            modelFiles[`./models/others/bot.png`],
            modelFiles[`./models/others/front.png`],
            modelFiles[`./models/others/back.png`],
        ])
        .then((textureCube) => {
            scene.background = textureCube;
        })
        .catch((error) => {
            console.error("Error loading skybox:", error);
        });

    pivot = new THREE.Group();
    camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(cameraTargetPosition.x, cameraTargetPosition.y, cameraTargetPosition.z);
    pivot.add(camera);
    camera.rotation.set(0, THREE.MathUtils.degToRad(-10), 0);
    pivot.rotation.set(THREE.MathUtils.degToRad(-33), 0, 0);
    scene.add(pivot);

    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(0, 0, 2);
    scene.add(light);

    let marsPath = unitsStore.others.find((model) => model.name === "mars");
    gltfLoader.loadAsync(marsPath?.modelPath || "").then((gltf) => {
        console.log(`Found model ${marsPath?.name}`);
        marsModel = gltf.scene;
        marsModel.scale.set(0.5, 0.5, 0.5);
        scene.add(marsModel);
        light.target = marsModel;
    });

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);

    window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    camera.position.lerp(cameraTargetPosition, LERP_FACTOR);
    render();
}

function render() {
    pivot.rotation.y += 0.0005;
    renderer.render(scene, camera);
}

function updateScene(newState: string) {
    switch (newState) {
        case SceneStates.LOGIN:
            cameraTargetPosition.set(0, 2, 2);
            break;
        case SceneStates.MENU:
            cameraTargetPosition.set(0, 0, 2);
            break;
    }
}

onMounted(() => {
    init();
    scene_container.value.appendChild(renderer.domElement);
    animate();
});
</script>

<style lang="scss" scoped>
.background {
    @extend .fullsize;
    left: 0;
    top: 0;
    background: var(--background);
    background-size: cover;
    background-position: center;
    z-index: -1;
    // transition: 1s ease-in-out;
    &__overlay {
        // background-color: rgba(0, 0, 0, 0.65);
        // backdrop-filter: blur(0px);
        z-index: -1;
        // transition:
        // background-color,
        // backdrop-filter 0.4s ease-in-out;
        // &.active {
        // background-color: rgba(0, 0, 0, 0.45);
        // backdrop-filter: blur(7px) saturate(90%);
        // }
    }
}
</style>
