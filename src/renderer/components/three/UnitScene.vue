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
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
// import { FXAAShader } from 'three/addons/shaders/FXAAShader.js'; // Not used
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { BrightnessContrastShader } from "three/addons/shaders/BrightnessContrastShader.js";
import { modelFiles } from "@renderer/assets/assetFiles";
import Panel from "@renderer/components/common/Panel.vue";

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

const isMobile = false; //Some code from web relies on this boolean still, so we just set it to false for now.
// --- Performance Settings Based on Device ---
const performanceSettings = {
    pixelRatioCap: isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio,
    shadowMapSize: isMobile ? 256 : 1024,
    shadowMapType: isMobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap,
    //anisotropy: isMobile ? 4 : (window.renderer ? window.renderer.capabilities.getMaxAnisotropy() / 2 : 8), // Calculated later
    anisotropy: 4, //temporary since we don't have a "window" object to check
    ssaoKernelSize: isMobile ? 6 : 12,
    ssaoKernelRadius: isMobile ? 8 : 16,
    ssaoEnabled: true,
    powerPreference: isMobile ? "low-power" : "high-performance", //this is overridden below
    // --- FPS Limit Setting ---
    targetFPS: isMobile ? 30 : 60, // Target FPS (e.g., 30). Set higher (e.g., 60) or null to disable limit.
};

const scene_container = ref();
let scene: THREE.Scene;
const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: true,
    powerPreference: "high-performance",
});
renderer.setPixelRatio(performanceSettings.pixelRatioCap);
//renderer.setSize(scene_container.value.offsetWidth, scene_container.value.offsetHeight); //dimenions missing from the ref object?
renderer.setSize(800, 600);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
// --- Shadow Setup (Applying Mobile Optimizations) ---
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = performanceSettings.shadowMapType;
const shadowMapSize = performanceSettings.shadowMapSize;

let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;

let composer: EffectComposer;
let modelScene: THREE.Group;
let mixer: THREE.AnimationMixer;
const clock = new THREE.Clock();
let animationFrameId: number;
let lastRenderTime = 0; // For FPS limiting
const fpsInterval = performanceSettings.targetFPS ? 1000 / performanceSettings.targetFPS : 0; // ms per frame
const timeUniform = { value: 0.0 };
let isTurntableEnabledByUser = true;
let isInteracting = false,
    idleTimer = null,
    turntableActive = false;
let isEnvDragging = false;
const turntableSpeed = 0.22;

function generateScene() {
    scene = new THREE.Scene();
    //const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    //const camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 2000);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.035;
    controls.minDistance = 1;
    controls.maxDistance = 500;

    const selectedHdrUrl = modelFiles["./models/hdr/clarens_midday_2k5.hdr"];
    //default for Armada
    let teamColorValue = 0x0043ee;
    let normalMapScaleY = 2.2,
        roughnessValue = 0.45,
        envMapIntensityValue = 1.05;
    let pbrEmissiveIntensityValue = 14.0,
        pulseMaxValue = 1.4;
    if (props.faction == "cor") {
        teamColorValue = 0xff0000;
        roughnessValue = 0.5;
        envMapIntensityValue = 0.95;
        pbrEmissiveIntensityValue = 15.0;
    } else if (props.faction == "leg") {
        teamColorValue = 0x00ff00;
        roughnessValue = 0.8;
        envMapIntensityValue = 0.89;
        pbrEmissiveIntensityValue = 12.0;
    }
    const teamColor = new THREE.Color(teamColorValue);
    const pbrEmissiveIntensity = pbrEmissiveIntensityValue;
    const modelURL = props.modelPath;
    const diffuseURL = props.colorMap;
    const pbrURL = props.otherMap;
    const normalURL = props.normalMap;
    const teamURL = props.teamMap;

    // --- Lights ---
    const lightGroup = new THREE.Group();
    scene.add(lightGroup);
    const keyLightIntensity = 0.6,
        fillLightIntensity = 0.1,
        ambientLightIntensity = 0.02;

    const directionalLight = new THREE.DirectionalLight(0xffffff, keyLightIntensity);
    directionalLight.position.set(3, 2, 0);
    directionalLight.castShadow = true;
    lightGroup.add(directionalLight);
    directionalLight.shadow.mapSize.width = shadowMapSize;
    directionalLight.shadow.mapSize.height = shadowMapSize;
    directionalLight.shadow.camera.near = 0.0001;
    directionalLight.shadow.camera.far = 500;
    let shadowCamSize = 25;
    directionalLight.shadow.bias = -0.0005;

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, fillLightIntensity);
    directionalLight2.position.set(-3, 2, -4);
    directionalLight2.castShadow = false;
    lightGroup.add(directionalLight2);

    const ambientLight = new THREE.AmbientLight(0xffffff, ambientLightIntensity);
    scene.add(ambientLight);

    // --- Loaders ---
    const textureLoader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();
    const hdrLoader = new HDRLoader();

    // --- Variables ---
    let material, groundMesh;
    const idleTimeoutDuration = 3000;
    let isAltDown = false,
        startMouseX = 0,
        startMouseY = 0;
    const envRotationSpeed = 4;
    let renderPass, ssaoPass, smaaPass, brightnessContrastPass, outputPass;
    let animations: THREE.AnimationClip[] = [],
        animationActions = {},
        currentAction = null,
        isPlayingAnimation = false;
    const loopingAnimationName = "walk";

    // --- Resource Loading ---
    Promise.all([
        hdrLoader
            .loadAsync(selectedHdrUrl)
            .then((tex) => {
                tex.mapping = THREE.EquirectangularReflectionMapping;
                scene.environment = tex;
                scene.background = null;
                return tex;
            })
            .catch((hdrError) => {
                console.error("HDR LOAD FAILED:", hdrError);
                scene.environment = null;
                return null;
            }),
        textureLoader.loadAsync(diffuseURL),
        textureLoader.loadAsync(pbrURL),
        textureLoader.loadAsync(normalURL),
        textureLoader.loadAsync(teamURL),
        gltfLoader.loadAsync(modelURL),
    ])
        .then(([envResult, diffuseMap, pbrMap, normalMap, teamMap, gltf]) => {
            if (!gltf || !gltf.scene) {
                throw new Error("GLTF model data missing after load.");
            }

            if (teamMap) {
                console.log("Team Map Texture Loaded:", teamMap);
            } else {
                console.error("Team Map Texture FAILED to load!");
            }

            function setupTexture(texture, colorSpace, needsFlipY = false) {
                if (!texture) return;
                texture.colorSpace = colorSpace;
                texture.flipY = needsFlipY;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.anisotropy = performanceSettings.anisotropy;
                texture.needsUpdate = true;
            }
            setupTexture(diffuseMap, THREE.SRGBColorSpace);
            setupTexture(pbrMap, THREE.LinearSRGBColorSpace);
            setupTexture(normalMap, THREE.LinearSRGBColorSpace);
            setupTexture(teamMap, THREE.LinearSRGBColorSpace);

            material = new THREE.MeshStandardMaterial({
                map: diffuseMap,
                normalMap: normalMap,
                normalScale: new THREE.Vector2(1, normalMapScaleY),
                metalness: 1.0,
                roughness: roughnessValue,
                emissive: new THREE.Color(0x000000),
                envMap: scene.environment,
                envMapIntensity: envMapIntensityValue,
                side: THREE.DoubleSide,
                transparent: false,
            });

            // --- onBeforeCompile Shader (Using the logic from the user's original working script) ---
            material.onBeforeCompile = (shader) => {
                try {
                    // Uniform Assignments
                    shader.uniforms.pbrMap = { value: pbrMap };
                    shader.uniforms.teamColor = { value: teamColor };
                    shader.uniforms.teamMap = { value: teamMap };
                    shader.uniforms.pbrEmissiveIntensity = { value: pbrEmissiveIntensity };
                    shader.uniforms.time = timeUniform;

                    let vs = shader.vertexShader;
                    let fs = shader.fragmentShader;

                    // Precision and Varyings
                    if (!fs.startsWith("precision highp float;")) {
                        fs = "precision highp float;\n" + fs;
                    }
                    if (!vs.includes("varying vec2 vUv;")) vs = "varying vec2 vUv;\n" + vs;
                    if (!vs.includes("vUv = uv;")) vs = vs.replace("#include <uv_vertex>", `#include <uv_vertex>\n    vUv = uv;`);

                    // Add Uniform Declarations
                    let finalDeclarations = "";
                    if (!fs.includes("uniform sampler2D pbrMap;")) finalDeclarations += "uniform sampler2D pbrMap;\n";
                    if (!fs.includes("uniform vec3 teamColor;")) finalDeclarations += "uniform vec3 teamColor;\n";
                    if (!fs.includes("uniform sampler2D teamMap;")) finalDeclarations += "uniform sampler2D teamMap;\n";
                    if (!fs.includes("uniform float pbrEmissiveIntensity;")) finalDeclarations += "uniform float pbrEmissiveIntensity;\n";
                    if (!fs.includes("uniform float time;")) finalDeclarations += "uniform float time;\n";
                    if (!fs.includes("varying vec2 vUv;")) finalDeclarations += "varying vec2 vUv;\n";
                    // Add define for team map usage if texture exists
                    if (shader.uniforms.teamMap.value) {
                        finalDeclarations += "#define USE_TEAMMAP\n";
                    }
                    if (finalDeclarations) {
                        fs = fs.replace(/(precision highp float;\s*)/, `$1${finalDeclarations}`);
                    }

                    // PBR Sampling (Using original script's logic: Roughness B, Metalness G)
                    fs = fs.replace(
                        "#include <roughnessmap_fragment>",
                        `float roughnessFactor = roughness; vec4 texelRoughness = texture2D( pbrMap, vUv ); roughnessFactor *= texelRoughness.b;`
                    );
                    fs = fs.replace(
                        "#include <metalnessmap_fragment>",
                        `float metalnessFactor = metalness; vec4 texelMetalness = texture2D( pbrMap, vUv ); metalnessFactor *= texelMetalness.g;`
                    );

                    // Modify Diffuse Color (Using original script's logic)
                    const colorFragmentReplacement = `
                            #include <color_fragment> // Get original diffuseColor calculation
    
                            #ifdef USE_TEAMMAP
                                float S_teamMask = texture2D( teamMap, vUv ).r;
                                float S_threshold = 0.35;
                                float S_blendFactor = step(S_threshold, S_teamMask);
                                float intensity = 0.75;
                                vec3 targetColor = mix(diffuseColor.rgb, teamColor, intensity);
                                diffuseColor.rgb = mix(diffuseColor.rgb, targetColor, S_blendFactor);
                            #endif
                        `;
                    fs = fs.replace("#include <color_fragment>", colorFragmentReplacement);

                    // Tonemapping Replacement (Using original script's logic)
                    const tonemappingReplacement = `
                            // PBR Boost calculation
                            vec3 S_pbrBoost = vec3(0.0);
                            #ifdef USE_MAP
                                float S_emissionAmount = texture2D( pbrMap, vUv ).r; // Emission Mask (Red)
                                if (S_emissionAmount > 0.01) { // Optimization
                                    const float S_dwellDuration = 1.0; const float S_transitionDuration = 1.5; const float S_cycleDuration = S_dwellDuration + S_transitionDuration;
                                    const float S_pulseMin = 0.01; const float S_pulseMax = ${pulseMaxValue.toFixed(2)}; const float S_pulseRange = S_pulseMax - S_pulseMin; float S_timeInCycle = mod(time, S_cycleDuration);
                                    float S_sineWave = sin(max(0.0, (S_timeInCycle - S_dwellDuration) / S_transitionDuration) * 3.14159); // Use PI constant
                                    float S_transitionFactor = step(S_dwellDuration, S_timeInCycle) * S_sineWave; float S_pulseFactor = S_pulseMin + S_pulseRange * S_transitionFactor;
                                    vec4 S_diffuseTexel = texture2D( map, vUv ); vec3 S_boostDiffuseLinear = pow( S_diffuseTexel.rgb, vec3( 2.2 ) ); // Use base diffuse texture for boost color base
                                    S_pbrBoost = S_boostDiffuseLinear * S_emissionAmount * pbrEmissiveIntensity * S_pulseFactor;
                                }
                            #endif
    
                            // Combine outgoing light with PBR boost ONLY (totalEmissiveRadiance includes standard emissive)
                            vec3 S_combinedLight = outgoingLight + totalEmissiveRadiance + S_pbrBoost;
    
                            // Apply tone mapping
                            #ifdef USE_TONEMAPPING
                                gl_FragColor.rgb = toneMapping( S_combinedLight );
                            #else
                                gl_FragColor.rgb = S_combinedLight;
                            #endif
                        `;
                    fs = fs.replace("#include <tonemapping_fragment>", tonemappingReplacement);

                    // Output Fragment (Using original script's logic)
                    fs = fs.replace(
                        "#include <output_fragment>",
                        `#if defined( TONE_MAPPING ) /* Handled earlier */ #endif gl_FragColor.a = diffuseColor.a;`
                    ); // Ensure alpha is set

                    // Remove standard emissive map calculation as it's included in totalEmissiveRadiance
                    fs = fs.replace("#include <emissivemap_fragment>", "");

                    shader.vertexShader = vs;
                    shader.fragmentShader = fs;
                } catch (e) {
                    console.error("onBeforeCompile Error:", e);
                }
            };

            // --- Mesh Setup ---
            modelScene = gltf.scene;
            let meshFound = false;
            modelScene.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) {
                    meshFound = true;
                    child.material = material;
                    const lcn = child.name.toLowerCase();
                    const hide = ["flare", "fire", "emit", "jam", "wake", "bow", "nano", "blink", "glow", "light", "heat"];
                    if (hide.some((k) => lcn.includes(k))) {
                        child.visible = false;
                        child.castShadow = false;
                        child.receiveShadow = false;
                    } else {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.visible = true;
                    }
                }
            });
            if (!meshFound) {
                console.warn("No meshes found in GLTF!");
            }

            // --- Animation Setup ---
            animations = gltf.animations;
            if (animations && animations.length) {
                mixer = new THREE.AnimationMixer(modelScene);
                animations.forEach((clip) => {
                    const action = mixer.clipAction(clip);
                    animationActions[clip.name] = action;
                    if (clip.name === loopingAnimationName) {
                        action.setLoop(THREE.LoopRepeat, Infinity);
                        action.clampWhenFinished = false;
                    } else {
                        action.setLoop(THREE.LoopOnce, 1);
                        action.clampWhenFinished = true;
                    }
                });
                let initialAction = animationActions[loopingAnimationName];
                if (!initialAction && animations.length > 0) {
                    initialAction = animationActions[animations[0].name];
                }
                if (initialAction) {
                    currentAction = initialAction;
                    // @ts-expect-error currentAction is set to initialAction if there is an initialAction, therefore this will not be null.
                    currentAction.reset().play();
                    isPlayingAnimation = true;
                    //TODO maybe add buttons back in?
                    //if (animToggleButton) { animToggleButton.style.display = 'flex'; }
                } //else { if (animToggleButton) animToggleButton.style.display = 'none'; }
            } //else { if (animToggleButton) animToggleButton.style.display = 'none'; }

            // --- Scene Centering & Ground ---
            const box = new THREE.Box3().setFromObject(modelScene);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            modelScene.position.sub(center);
            scene.add(modelScene);
            const modelMaxDim = Math.max(size.x, size.y, size.z);
            shadowCamSize = modelMaxDim * 1.5;
            directionalLight.shadow.camera.left = -shadowCamSize;
            directionalLight.shadow.camera.right = shadowCamSize;
            directionalLight.shadow.camera.top = shadowCamSize;
            directionalLight.shadow.camera.bottom = -shadowCamSize;
            directionalLight.shadow.camera.updateProjectionMatrix();
            const groundPlaneSize = modelMaxDim * 4.0;
            if (groundMesh) scene.remove(groundMesh);
            const groundGeometry = new THREE.PlaneGeometry(groundPlaneSize, groundPlaneSize);
            const groundMaterial = new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.4 });
            groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
            groundMesh.rotation.x = -Math.PI / 2;
            groundMesh.position.y = box.min.y - center.y;
            groundMesh.receiveShadow = true;
            scene.add(groundMesh);

            // --- Camera Setup ---
            const baseHorizontalDistance = Math.max(size.length() / 1.5, groundPlaneSize / 5);
            const distanceMultiplier = 1.8;
            const horizontalDistance = baseHorizontalDistance * distanceMultiplier;
            const horizontalAngleRadians = Math.PI / -10;
            const verticalAngleDegrees = 40;
            const verticalAngleRadians = verticalAngleDegrees * (Math.PI / 180);
            const xPos = horizontalDistance * Math.sin(horizontalAngleRadians);
            const zPos = horizontalDistance * Math.cos(horizontalAngleRadians);
            const yPos = horizontalDistance * Math.tan(verticalAngleRadians);
            camera.position.set(xPos, yPos, zPos);
            controls.target.set(0, 0, 0);
            const totalDistance = Math.sqrt(horizontalDistance ** 2 + yPos ** 2);
            camera.far = Math.max(totalDistance * 5, size.length() * 5, groundPlaneSize * 2);
            camera.updateProjectionMatrix();
            controls.update();

            // --- Setup Effect Composer (Applying Mobile Optimizations) ---
            composer = new EffectComposer(renderer);
            renderPass = new RenderPass(scene, camera);
            composer.addPass(renderPass);

            const currentWidth = scene_container.value.offsetWidth;
            const currentHeight = scene_container.value.offsetHeight;
            const currentPixelRatio = renderer.getPixelRatio();

            // SSAO Pass (Applying Mobile Optimizations)
            if (performanceSettings.ssaoEnabled) {
                ssaoPass = new SSAOPass(scene, camera, currentWidth, currentHeight);
                ssaoPass.kernelRadius = performanceSettings.ssaoKernelRadius;
                ssaoPass.kernelSize = performanceSettings.ssaoKernelSize;
                ssaoPass.minDistance = 0.003;
                ssaoPass.maxDistance = Math.max(5.5, modelMaxDim * 0.5);
                if (ssaoPass.params && ssaoPass.params.saoIntensity !== undefined) {
                    ssaoPass.params.saoIntensity = 1.5;
                } else if (ssaoPass.intensity !== undefined) {
                    ssaoPass.intensity = 5.5;
                }
                composer.addPass(ssaoPass);
            }

            // SMAA Pass
            //smaaPass = new SMAAPass(currentWidth * currentPixelRatio, currentHeight * currentPixelRatio);
            smaaPass = new SMAAPass();
            composer.addPass(smaaPass);

            // Output Pass
            outputPass = new OutputPass();
            composer.addPass(outputPass);

            // Brightness/Contrast Pass
            brightnessContrastPass = new ShaderPass(BrightnessContrastShader);
            brightnessContrastPass.uniforms["brightness"].value = 0.04;
            brightnessContrastPass.uniforms["contrast"].value = 0.12;
            composer.addPass(brightnessContrastPass);

            // --- Interaction Listeners ---
            controls.addEventListener("start", () => {
                isInteracting = true;
                turntableActive = false;
                if (idleTimer) clearTimeout(idleTimer);
                idleTimer = null;
            });
            controls.addEventListener("end", () => {
                isInteracting = false;
                if (idleTimer) clearTimeout(idleTimer);
                if (isTurntableEnabledByUser) {
					//@ts-expect-error idleTimer will not be null?
                    idleTimer = setTimeout(() => {
                        if (isTurntableEnabledByUser && !isInteracting) {
                            turntableActive = true;
                        }
                        idleTimer = null;
                    }, idleTimeoutDuration);
                }
            });

            //let savedEventListeners = {};
            //function detachControlListeners() { const el = controls.domElement; if (!el || !el._listeners) return; savedEventListeners = {}; const evts = ['contextmenu', 'pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel', 'keydown']; evts.forEach(t => { if (el._listeners && el._listeners[t]) { savedEventListeners[t] = [...el._listeners[t]]; savedEventListeners[t].forEach(lO => { const lF = typeof lO === 'function' ? lO : lO.listener; if (lF) el.removeEventListener(t, lF); }); } }); }
            //function attachControlListeners() { const el = controls.domElement; if (!el) return; for (const t in savedEventListeners) { if (savedEventListeners[t]) { savedEventListeners[t].forEach(lO => { const lF = typeof lO === 'function' ? lO : lO.listener; if (lF) el.addEventListener(t, lF); }); } } savedEventListeners = {}; }

            //window.addEventListener('keydown', (e) => { if (e.code === 'Space' && !isAltDown && !e.repeat) { e.preventDefault(); toggleAnimation(); } if (e.altKey) { isAltDown = true; if (!isEnvDragging) scene_container.value.style.cursor = 'move'; } });
            //window.addEventListener('keyup', (e) => { if (!e.altKey && isAltDown) { isAltDown = false; scene_container.value.style.cursor = isEnvDragging ? 'grabbing' : 'grab'; if (isEnvDragging) { isEnvDragging = false; controls.enabled = true; attachControlListeners(); scene_container.value.classList.remove('grabbing'); scene_container.value.style.cursor = 'grab'; try { const pUE = new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: startMouseX, clientY: startMouseY, pointerId: 1 }); controls.domElement.dispatchEvent(pUE); } catch (err) { console.warn("Synthetic pointerup failed:", err); } } } });
            //scene_container.value.addEventListener('pointerdown', (e) => { if (isAltDown) { e.preventDefault(); isEnvDragging = true; startMouseX = e.clientX; startMouseY = e.clientY; controls.enabled = false; detachControlListeners(); scene_container.value.classList.add('grabbing'); scene_container.value.style.cursor = 'grabbing'; try { scene_container.value.setPointerCapture(e.pointerId); } catch (err) { } } });
            //scene_container.value.addEventListener('pointermove', (e) => { if (isEnvDragging && lightGroup) { const dX = e.clientX - startMouseX; const dY = e.clientY - startMouseY; lightGroup.rotation.y += dX * (envRotationSpeed / scene_container.value.clientWidth); const nRX = lightGroup.rotation.x + dY * (envRotationSpeed / scene_container.value.clientHeight); lightGroup.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, nRX)); startMouseX = e.clientX; startMouseY = e.clientY; } });
            //const handleEnvDragEnd = (e) => { if (isEnvDragging) { isEnvDragging = false; controls.enabled = true; attachControlListeners(); scene_container.value.classList.remove('grabbing'); scene_container.value.style.cursor = isAltDown ? 'move' : 'grab'; try { scene_container.value.releasePointerCapture(e.pointerId); } catch (err) { } } };
            //scene_container.value.addEventListener('pointerup', handleEnvDragEnd); scene_container.value.addEventListener('pointerleave', handleEnvDragEnd); scene_container.value.addEventListener('lostpointercapture', handleEnvDragEnd);

            if (isTurntableEnabledByUser) {
                turntableActive = true;
            }

            //function toggleAnimation() { if (!mixer || !currentAction) return; currentAction.paused = !currentAction.paused; isPlayingAnimation = !currentAction.paused; if (isPlayingAnimation) { if (!currentAction.isRunning()) { if (currentAction.loop === THREE.LoopOnce && currentAction.time === currentAction.getClip().duration) { currentAction.reset().play(); } else { currentAction.play(); } } } }
            //if (animToggleButton) { animToggleButton.addEventListener('click', toggleAnimation); }
            //if (rotateToggleButton) { rotateToggleButton.addEventListener('click', () => { isTurntableEnabledByUser = !isTurntableEnabledByUser; if (isTurntableEnabledByUser) { if (!isInteracting) { turntableActive = true; } if (idleTimer) clearTimeout(idleTimer); idleTimer = null; } else { turntableActive = false; if (idleTimer) clearTimeout(idleTimer); idleTimer = null; } }); }
            /*
		function exportHighResPNG(exportWidth, exportHeight) {
			const origW = scene_container.value.offsetWidth, origH = scene_container.value.offsetHeight, origPR = renderer.getPixelRatio(), origAsp = camera.aspect;
			if (exportButton) { exportButton.disabled = true; }
			requestAnimationFrame(() => {
				try {
					renderer.setPixelRatio(1); renderer.setSize(exportWidth, exportHeight, false);
					composer.setPixelRatio(1); composer.setSize(exportWidth, exportHeight);
					camera.aspect = exportWidth / exportHeight; camera.updateProjectionMatrix();
					if (ssaoPass && performanceSettings.ssaoEnabled) ssaoPass.setSize(exportWidth, exportHeight);
					if (smaaPass && typeof smaaPass.setSize === 'function') smaaPass.setSize(exportWidth, exportHeight); // Check if SMAA needs resize
					composer.render();
					const dataURL = renderer.domElement.toDataURL('image/png');
					const link = document.createElement('a'); link.href = dataURL; link.download = `${unitName || 'model'}_export_${exportWidth}x${exportHeight}.png`;
					document.body.appendChild(link); link.click(); document.body.removeChild(link);
				} catch (error) { console.error("PNG Export Error:", error); if (noticeElement) { noticeElement.textContent = `Export Error: ${error.message}`; noticeElement.style.display = 'block'; } else { alert("Error exporting PNG."); } }
				finally {
					renderer.setPixelRatio(origPR); renderer.setSize(origW, origH, false);
					composer.setPixelRatio(origPR); composer.setSize(origW, origH);
					camera.aspect = origAsp; camera.updateProjectionMatrix();
					if (ssaoPass && performanceSettings.ssaoEnabled) ssaoPass.setSize(origW, origH);
					if (smaaPass && typeof smaaPass.setSize === 'function') smaaPass.setSize(origW * origPR, origH * origPR); // Restore SMAA size
					if (exportButton) { exportButton.disabled = false; }
					requestAnimationFrame(() => { if (composer) composer.render(); else if (renderer) renderer.render(scene, camera); });
				}
			});
		}
		if (exportButton) { exportButton.addEventListener('click', () => { const expW = 4096; const aspect = container.offsetWidth / container.offsetHeight; const expH = Math.round(expW / aspect); exportHighResPNG(expW, expH); }); }
		*/

            // --- Resize Handler (Applying Mobile Optimizations) ---
            const handleResize = () => {
                const w = scene_container.value.offsetWidth,
                    h = scene_container.value.offsetHeight;
                if (w > 0 && h > 0) {
                    const can = renderer.domElement;
                    const newPixelRatio = performanceSettings.pixelRatioCap; // Use capped ratio

                    if (can.width === w && can.height === h && renderer.getPixelRatio() === newPixelRatio) return;

                    camera.aspect = w / h;
                    camera.updateProjectionMatrix();
                    renderer.setPixelRatio(newPixelRatio);
                    renderer.setSize(w, h);
                    composer.setPixelRatio(newPixelRatio);
                    composer.setSize(w, h);

                    // Update passes
                    if (ssaoPass && performanceSettings.ssaoEnabled) ssaoPass.setSize(w, h);
                    if (smaaPass) {
                        // SMAAPass size is set in pixels, needs update
                        smaaPass.setSize(w * newPixelRatio, h * newPixelRatio);
                    }
                }
            };
            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(scene_container.value);
            handleResize(); // Initial call
            animate(); // Start loop
        })
        .catch((error) => {
            console.error("Fatal Error loading/setup:", error);
        });
}

function resetScene() {
    // TODO: Make sure we don't have memory leaks, especially with textures/materials
    scene.clear();
    generateScene();
}

function animate() {
    animationFrameId = requestAnimationFrame(animate); // Request next frame immediately

    // --- FPS Limiting Logic ---
    const now = performance.now();
    const elapsed = now - lastRenderTime;

    // If enough time has passed, draw the next frame
    if (!fpsInterval || elapsed > fpsInterval) {
        // Get ready for next frame by setting lastRenderTime=now, but also adjust for your
        // specified fpsInterval not being a multiple of RAF's interval (often 16.7ms)
        if (fpsInterval) {
            lastRenderTime = now - (elapsed % fpsInterval);
        }

        // --- Get Delta Time for Updates ---
        // IMPORTANT: Use clock.getDelta() for physics/animation updates
        // It measures time since the *last call to getDelta*, ensuring
        // consistent updates even if rendering is skipped.
        const deltaTime = clock.getDelta();

        // --- Update Section ---
        timeUniform.value = clock.elapsedTime; // Update shader time uniform

        // Rotate model if turntable is active
        if (turntableActive && modelScene && !isInteracting && !isEnvDragging) {
            modelScene.rotation.y += turntableSpeed * deltaTime;
        }

        // Update controls (handles damping)
        if (!isEnvDragging) {
            controls.update(); // Use internal clock of controls if damping is enabled
        }

        // Update animation mixer
        if (mixer) {
            mixer.update(deltaTime);
        }

        // --- Render Section ---
        try {
            if (composer) {
                composer.render(deltaTime); // Pass deltaTime if needed by passes
            } else if (renderer) {
                renderer.render(scene, camera);
            }
        } catch (e) {
            console.error("Render loop error:", e);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            //if (noticeElement) { noticeElement.textContent = `Render Error: ${e.message}. Refresh.`; noticeElement.style.display = 'block'; }
        }
    }
    // --- End FPS Limiting Check ---

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
