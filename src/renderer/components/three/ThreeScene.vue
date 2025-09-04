<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div ref="scene_container"></div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { modelFiles } from "@renderer/assets/assetFiles";

const scene_container = ref();

const scene = new THREE.Scene();
//const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 2000);

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(500, 500);

const loader = new GLTFLoader();
let model: THREE.Group = new THREE.Group();

loader.load(
    modelFiles["./models/armvang.glb"],
    function (gltf) {
        model = gltf.scene;
        scene.add(model);
        model.position.z = -10;
    },

    function (xhr) {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },

    function (error) {
        console.log("Error: ", error);
    }
);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
//scene.add(cube);

camera.position.z = 50;

const light = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(light);

function animate() {
    requestAnimationFrame(animate);

    model.rotation.x += 0.01;
    model.rotation.y += 0.01;

    renderer.render(scene, camera);
}

onMounted(() => {
    scene_container.value.appendChild(renderer.domElement);
    animate();
});
</script>

<style lang="scss" scoped></style>
