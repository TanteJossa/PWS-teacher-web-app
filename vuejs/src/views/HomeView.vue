<template lang="pug">
canvas#hero-canvas
</template>

<script>
import * as THREE from 'three';
import { onMounted, onBeforeUnmount, ref, reactive, getCurrentInstance, toRaw } from 'vue';

export default {
    name: 'ThreejsHero',
    components: {

    },
    props: {

    },
    emits: [],
    setup() {
        const canvasRef = ref(null);
        let ambientLight, pointLight, raycaster, clickPlane;
        const waves = reactive([]);
        const spheresGlobalData = reactive([]);
        const layerData = reactive([
            { zOffset: 0,    parallaxFactor: 1,   group: new THREE.Group(), count: 5, basePosition: new THREE.Vector3(0, 0, 0) },
            { zOffset: -5,   parallaxFactor: 0.7, group: new THREE.Group(), count: 5, basePosition: new THREE.Vector3(0, 0, -5) },
            { zOffset: -10,  parallaxFactor: 0.5, group: new THREE.Group(), count: 5, basePosition: new THREE.Vector3(0, 0, -10) },
            { zOffset: -15,  parallaxFactor: 0.3, group: new THREE.Group(), count: 3, basePosition: new THREE.Vector3(0, 0, -15) },
            { zOffset: -20,  parallaxFactor: 0.2, group: new THREE.Group(), count: 2, basePosition: new THREE.Vector3(0, 0, -20) }
        ]);
        const mouse = reactive(new THREE.Vector2());
        let targetScrollProgress = 0;
        let currentScrollProgress = 0;

        // Get current Vue instance proxy
        const instance = getCurrentInstance();
        const proxy = instance.proxy;

        class EnergyWave {
            constructor(x, y, z) {
                this.center = new THREE.Vector3(x, y, z);
                this.radius = 0;
                this.maxRadius = 30;
                this.speed = 0.2;
                this.strength = 1;
                this.life = 1;
            }

            update() {
                this.radius += this.speed;
                this.life = Math.max(0, 1 - this.radius / this.maxRadius);
                return this.life > 0;
            }
        }


        const initThreeJS = () => {
            const canvas = canvasRef.value;

            /**
             * SCENE, CAMERA, RENDERER
             */
            proxy.$scene = new THREE.Scene();
            proxy.$camera = new THREE.PerspectiveCamera(
                55,
                window.innerWidth / window.innerHeight,
                0.1,
                100
            );
            proxy.$scene.add(toRaw(proxy.$camera));

            proxy.$renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                alpha: true,
                antialias: true
            });
            proxy.$renderer.setSize(window.innerWidth, window.innerHeight);
            proxy.$renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            /**
             * LIGHTS
             */
            ambientLight = new THREE.AmbientLight(0x3b82f6, 0.3);
            proxy.$scene.add(ambientLight);

            pointLight = new THREE.PointLight(0xffffff, 0.3, 100);
            pointLight.position.set(10, 20, 10);
            proxy.$scene.add(pointLight);

            /**
             * LAYER SETUP
             */
            layerData.forEach(layer => {
                layer.group.position.copy(layer.basePosition);
                proxy.$scene.add(toRaw(layer.group));
            });

            /**
             * SPHERE GENERATION
             */
            layerData.forEach(layer => {
                const BOUNDS = {
                    minX: -10,
                    maxX: 10,
                    minY: -6,
                    maxY: 6,
                    minZ: -3,
                    maxZ: 3
                };

                for (let i = 0; i < layer.count; i++) {
                    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
                    const material = new THREE.MeshPhongMaterial({
                        color: 0x3b82f6,
                        transparent: true,
                        opacity: 0.6,
                        emissive: 0x000000,
                        emissiveIntensity: 0
                    });

                    const sphere = new THREE.Mesh(geometry, material);

                    const posX = THREE.MathUtils.randFloat(BOUNDS.minX, BOUNDS.maxX);
                    const posY = THREE.MathUtils.randFloat(BOUNDS.minY, BOUNDS.maxY);
                    const posZ = THREE.MathUtils.randFloat(BOUNDS.minZ, BOUNDS.maxZ);
                    sphere.position.set(posX, posY, posZ);

                    const speedX = THREE.MathUtils.randFloat(-0.02, 0.02);
                    const speedY = THREE.MathUtils.randFloat(-0.02, 0.02);
                    const speedZ = THREE.MathUtils.randFloat(-0.02, 0.02);

                    layer.group.add(sphere);

                    spheresGlobalData.push({
                        mesh: sphere,
                        velocity: new THREE.Vector3(speedX, speedY, speedZ),
                        baseOpacity: material.opacity,
                        originalScale: new THREE.Vector3(1, 1, 1),
                        bounds: BOUNDS,
                        layerParallax: layer.parallaxFactor,
                        layer: layer
                    });
                }
            });

            /**
             * CLICK EVENT FOR WAVE EFFECT
             */
            raycaster = new THREE.Raycaster();
            clickPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        };

        const onClick = (event) => {
            const mousePos = new THREE.Vector2(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1
            );

            // Update plane normal based on camera position
            clickPlane.normal.copy(toRaw(proxy.$camera).position).normalize();

            raycaster.setFromCamera(mousePos, toRaw(proxy.$camera));
            const intersection = new THREE.Vector3();
            raycaster.ray.intersectPlane(clickPlane, intersection);

            waves.push(new EnergyWave(intersection.x, intersection.y, intersection.z));
        };

        const onMouseMove = (event) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -((event.clientY / window.innerHeight) * 2 - 1);
        };

        const onScroll = () => {
            const docHeight = document.body.scrollHeight - window.innerHeight;
            const fraction = docHeight > 0 ? window.scrollY / docHeight : 0;
            targetScrollProgress = THREE.MathUtils.clamp(fraction, 0, 1);
        };

        const onWindowResize = () => {
            proxy.$camera.aspect = window.innerWidth / window.innerHeight;
            proxy.$camera.updateProjectionMatrix();
            proxy.$renderer.setSize(window.innerWidth, window.innerHeight);
        };

        const animate = () => {
            requestAnimationFrame(animate);

            // Smooth scroll interpolation
            currentScrollProgress += (targetScrollProgress - currentScrollProgress) * 0.05;

            // Camera movement
            const fullOrbit = 2 * Math.PI;
            const angle = currentScrollProgress * fullOrbit;
            const orbitRadius = 20;
            const camX = orbitRadius * Math.cos(angle);
            const camZ = orbitRadius * Math.sin(angle);
            const camY = 5 + currentScrollProgress * 10;

            proxy.$camera.position.set(camX, camY, camZ);
            proxy.$camera.lookAt(0, 0, 0);

            // Update waves
            for (let i = waves.length - 1; i >= 0; i--) {
                if (!waves[i].update()) {
                    waves.splice(i, 1);
                }
            }

            // Color transition
            const colorLight = new THREE.Color(0x3b82f6);
            const colorDark = new THREE.Color(0x1e40af);

            // Update layer positions based on scroll
            layerData.forEach(layer => {
                const parallaxOffset = currentScrollProgress * 5 * layer.parallaxFactor;
                layer.group.position.z = layer.basePosition.z + parallaxOffset;
            });

            // Update spheres
            spheresGlobalData.forEach(sphereData => {
                const { mesh, velocity, bounds, layerParallax, layer } = sphereData;

                // Convert sphere position to world space for mouse interaction
                const worldPos = new THREE.Vector3();
                sphereData.mesh.getWorldPosition(worldPos);

                const mouseAttractRadius = 3;
                const mouseAttractStrength = 0.001 * layerParallax;
                const mouseX3D = mouse.x * 10;
                const mouseZ3D = mouse.y * 10;

                const dx = mouseX3D - worldPos.x;
                const dz = mouseZ3D - worldPos.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < mouseAttractRadius) {
                    const force = (mouseAttractRadius - dist) * mouseAttractStrength;
                    velocity.x -= dx * force;
                    velocity.z -= dz * force;
                }

                // Wave effect
                let totalWaveEffect = 0;
                waves.forEach(wave => {
                    const distanceToWave = worldPos.distanceTo(toRaw(wave.center));
                    const waveZone = Math.abs(distanceToWave - wave.radius);

                    if (waveZone < 2) {
                        const waveIntensity = (1 - waveZone / 2) * wave.life * layerParallax;
                        totalWaveEffect = Math.max(totalWaveEffect, waveIntensity);
                    }
                });

                // Apply wave effect
                const scale = 1 + totalWaveEffect;
                mesh.scale.set(scale, scale, scale);
                mesh.material.emissive.setRGB(totalWaveEffect, totalWaveEffect, totalWaveEffect);

                // Random movement
                const noiseStrength = 0.0003;
                velocity.x += (Math.random() - 0.5) * noiseStrength;
                velocity.y += (Math.random() - 0.5) * noiseStrength;
                velocity.z += (Math.random() - 0.5) * noiseStrength;

                // Color update
                const currentColor = new THREE.Color().lerpColors(colorLight, colorDark, currentScrollProgress);
                mesh.material.color = currentColor;
            });

            proxy.$renderer.render(toRaw(proxy.$scene), toRaw(proxy.$camera));
        };

        const cleanup = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('resize', onWindowResize);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('click', onClick);

            spheresGlobalData.forEach(sphereData => {
                sphereData.mesh.geometry.dispose();
                sphereData.mesh.material.dispose();
                proxy.$scene.remove(toRaw(sphereData.mesh));
            });

            proxy.$renderer.dispose();
        };


        onMounted(() => {
            canvasRef.value = document.getElementById('hero-canvas');
            initThreeJS();
            animate();
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('resize', onWindowResize);
            window.addEventListener('scroll', onScroll);
            window.addEventListener('click', onClick);
        });

        onBeforeUnmount(() => {
            cleanup();
        });

        return {
            canvasRef
        };
    },
    data(){
        return {

        }
    },
    computed: {

    },
    methods: {

    },
    watch: {

    },
    // created() {

    // },


}
</script>

<style scoped>
canvas#hero-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1; /* Place behind other content */
}
</style>