<template lang="pug">
canvas(ref="canvasRef")
</template>

<script>
import * as THREE from 'three';
import { onMounted, onBeforeUnmount, ref, reactive, shallowReactive } from 'vue';

// EnergyWave class remains the same...

export default {
    name: 'ThreejsHero',
    setup() {
        const canvasRef = ref(null);
        let scene;
        let camera;
        let renderer;
        // let ambientLight; // Temporarily disable
        // let pointLight; // Temporarily disable
        // let raycaster; // Temporarily disable
        let clock;
        let animationFrameId = null;

        const waves = [];
        // const spheresGlobalData = []; // Temporarily disable complex data
        const layerData = shallowReactive([
             // Keep layerData structure, but we won't use all its props initially
            { id: 0, zOffset: 0,    parallaxFactor: 1,   group: new THREE.Group(), count: 5, basePosition: new THREE.Vector3(0, 0, 0) },
            { id: 1, zOffset: -5,   parallaxFactor: 0.7, group: new THREE.Group(), count: 5, basePosition: new THREE.Vector3(0, 0, -5) },
            // Add more layers if needed for testing depth
        ]);

        // const mouse = reactive(new THREE.Vector2()); // Temporarily disable
        // const clickPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Temporarily disable
        // let targetScrollProgress = 0; // Temporarily disable
        // let currentScrollProgress = 0; // Temporarily disable
        // const scrollLerpFactor = 0.05;
        // const velocityDamping = 0.98;

        const initThreeJS = () => {
            console.log("Attempting initThreeJS...");
            if (!canvasRef.value) {
                console.error("Canvas element not found in initThreeJS");
                return;
            }
            const canvas = canvasRef.value;
            clock = new THREE.Clock();

            /** SCENE, CAMERA, RENDERER */
            scene = new THREE.Scene();
            // --- TEST: Set a visible background color ---
            scene.background = new THREE.Color(0x555555); // Gray background

            camera = new THREE.PerspectiveCamera(
                75, // Wider FOV for testing
                window.innerWidth / window.innerHeight,
                0.1,
                1000 // Increased far plane for testing
            );
             // --- TEST: Set a fixed, simple camera position ---
             camera.position.set(0, 0, 15); // Positioned on Z axis, looking towards origin
             camera.lookAt(0, 0, 0); // Look at the center
             scene.add(camera);

            renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                // alpha: true, // Disable alpha for testing background color
                antialias: true
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
             // --- TEST: Ensure renderer clear color is opaque ---
             renderer.setClearColor(0x000000, 1); // Set black clear color (will be overridden by scene.background if set)


            /** LIGHTS */
             // --- TEST: Add a simple bright light ---
             const simpleLight = new THREE.DirectionalLight(0xffffff, 1.0);
             simpleLight.position.set(1, 1, 1).normalize();
             scene.add(simpleLight);
             const simpleAmbient = new THREE.AmbientLight(0x404040, 1.0); // Add some ambient
             scene.add(simpleAmbient);

            /** LAYER SETUP */
            layerData.forEach(layer => {
                layer.group.position.copy(layer.basePosition); // Use base position only
                scene.add(layer.group);
            });

            /** SPHERE GENERATION */
             // --- TEST: Add ONE simple, visible sphere ---
             const testGeo = new THREE.SphereGeometry(1, 32, 32); // Make it larger
             // --- TEST: Use MeshBasicMaterial (doesn't need lights) first ---
             // const testMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Bright Red
             // --- TEST: Or use Phong with the lights ---
             const testMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 }); // Bright Green

             const testSphere = new THREE.Mesh(testGeo, testMat);
             testSphere.position.set(0, 0, 0); // Place it directly at the origin (world space)
             // scene.add(testSphere); // Add directly to scene first

             // OR Add to a layer group to test group positioning:
             if(layerData.length > 0) {
                 // Place it relative to the first layer's group
                 testSphere.position.set(2, 0, 0); // Offset within the group
                 layerData[0].group.add(testSphere);
                 console.log(`Test sphere added to group at ${layerData[0].group.position.z}z`);
             } else {
                 scene.add(testSphere); // Fallback if no layers
                 console.log("Test sphere added directly to scene at origin");
             }


             // --- Disable complex sphere generation for now ---
             /*
            const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
            layerData.forEach(layer => {
                // ... original sphere loop ...
            });
            */

             // raycaster = new THREE.Raycaster(); // Disabled

             console.log("initThreeJS finished. Scene contains:", scene.children.length, "children");
             console.log("Camera position:", camera.position);
             console.log("Renderer size:", renderer.getSize(new THREE.Vector2()));

        };

        // --- Event Handlers (Keep Resize, disable others for test) ---

        // const onClick = (event) => { /* ... */ };
        // const onMouseMove = (event) => { /* ... */ };
        // const onScroll = () => { /* ... */ };

        const onWindowResize = () => {
             console.log("Window resize triggered");
            if (!camera || !renderer) return;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
             renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
             console.log("Resize finished. New Renderer size:", renderer.getSize(new THREE.Vector2()));
        };

        // --- Animation Loop ---

        const animate = () => {
            // console.log("Animating frame..."); // Uncomment for verbose logging
            animationFrameId = requestAnimationFrame(animate);
            const deltaTime = clock.getDelta();

            // --- Disable complex updates ---
            // currentScrollProgress += (targetScrollProgress - currentScrollProgress) * scrollLerpFactor;
            // Camera Movement (disabled - using fixed position)
            // Wave Update (disabled)
            // Color Transition (disabled)
            // Layer Parallax Update (disabled)
            // Sphere Update Loop (disabled)


            // --- TEST: Simple rotation of the test sphere's group (if added to group) ---
             if (layerData.length > 0 && layerData[0].group.children.length > 0) {
                 layerData[0].group.rotation.y += 0.005;
             }
            // --- TEST: Or rotate sphere if added directly ---
            // else if (scene.getObjectByName("testSphere")) { // Assuming you set .name = "testSphere"
            //     scene.getObjectByName("testSphere").rotation.y += 0.01;
            // }


            // --- Render ---
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            } else {
                console.error("Render aborted: Missing renderer, scene, or camera");
                cancelAnimationFrame(animationFrameId); // Stop loop if something is wrong
            }
        };

        const cleanup = () => {
            console.log("Cleaning up Three.js scene...");
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            // window.removeEventListener('mousemove', onMouseMove); // Disabled
            window.removeEventListener('resize', onWindowResize);
            // window.removeEventListener('scroll', onScroll); // Disabled
            // window.removeEventListener('click', onClick); // Disabled

             // Dispose of the test geometry/material explicitly
             scene?.traverse(object => {
                if (object.isMesh) {
                    object.geometry?.dispose();
                    if(Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material?.dispose();
                    }
                }
             });


            if (renderer) {
                renderer.dispose();
                 // if (renderer.domElement && renderer.domElement.parentNode) { // Might cause issues if Vue unmounts first
                 //     renderer.domElement.parentNode.removeChild(renderer.domElement);
                 // }
            }
            // spheresGlobalData.length = 0; // Disabled
            waves.length = 0;
            console.log("Cleanup complete.");
        };


        onMounted(() => {
            console.log("Component Mounted. Canvas ref:", canvasRef.value);
            initThreeJS();
            if (renderer && scene && camera) {
                console.log("Starting animation loop...");
                animate();
                window.addEventListener('resize', onWindowResize);
                // Add other listeners back if needed for testing them specifically
                 onWindowResize(); // Initial call
            } else {
                 console.error("!!! Animation not started because init failed or didn't create renderer/scene/camera !!!");
            }
        });

        onBeforeUnmount(() => {
            cleanup();
        });

        return {
            canvasRef
        };
    }
}
</script>

<style scoped>
/* Styles remain the same */
canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    /* Place behind other content */
    display: block;
    /* Prevent potential extra space below canvas */
    outline: none;
    /* Prevent outline on focus/click */
}
</style>