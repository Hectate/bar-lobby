<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Panel>
        <div ref="scene_container"></div>
    </Panel>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { modelFiles } from "@renderer/assets/assetFiles";
import Panel from "@renderer/components/common/Panel.vue";
import { textureLoad } from "three/src/nodes/TSL.js";

const props = defineProps<{
    modelPath: string;
    faction: string;
    colorMap: string;
    normalMap: string;
    teamMap: string;
    otherMap: string;
}>();

watch(
    () => props.modelPath,
    (newString, oldString) => {
        console.debug("The modelPath changed from ", oldString, " to ", newString);
        resetScene();
    }
);

const scene_container = ref();
let scene: THREE.Scene;
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(800, 600); //Fixme: Magic numbers
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;

function generateScene() {
    scene = new THREE.Scene();
    //const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    //const camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 2000);

    controls = new OrbitControls(camera, renderer.domElement);

    const modelLoader = new GLTFLoader();
    let model: THREE.Group = new THREE.Group();

    const texLoader = new THREE.TextureLoader();
    let material: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial();
    texLoader.load(
        props.colorMap,
        function (texture) {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.flipY = false;
            material.map = texture;
        },
        undefined,
        function (error) {
            console.log("Error: ", error);
        }
    );
    texLoader.load(props.normalMap, function (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        material.normalMap = texture;
    });
	texLoader.load(props.otherMap, function (texture) {
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.flipY = false;
		material.metalnessMap = texture;
		material.roughnessMap = texture;
	});
    modelLoader.load(
        props.modelPath,
        function (gltf) {
            model = gltf.scene;
            model.traverse((node: THREE.Object3D) => {
                if (node instanceof THREE.Mesh) {
                    const mesh = node as THREE.Mesh;
                    mesh.material = material;
                }
            });
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

    // Simple light round gradient to help give the model some background
    const shadowTex: THREE.Texture = texLoader.load(modelFiles["./models/shadow.png"]);
    const planeMat: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true });
    const planeGeo: THREE.PlaneGeometry = new THREE.PlaneGeometry(200, 200, 1, 1);
    const plane: THREE.Mesh = new THREE.Mesh(planeGeo, planeMat);
    scene.add(plane);

    camera.position.z = 60;
    camera.position.y = 50;
    camera.lookAt(model.position);
    plane.lookAt(camera.position); //orient the plane to the camera
    plane.position.sub(camera.position); //move it directly opposite from the origin as the camera

    const light = new THREE.DirectionalLight(0xffffff, 1);
    scene.add(light);
}

function resetScene() {
	// TODO: Make sure we don't have memory leaks, especially with textures/materials
	scene.clear();
	generateScene();
}

function animate() {
    requestAnimationFrame(animate);

    //model.rotation.x += 0.02;
    //model.rotation.y += 0.01;
    controls.update();
    renderer.render(scene, camera);
}

onMounted(() => {
    scene_container.value.appendChild(renderer.domElement);
	generateScene();
    animate();
});
</script>

<style lang="scss" scoped></style>
