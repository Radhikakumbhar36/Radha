import * as THREE from "./libs/three125/three.module.js";
import { GLTFLoader } from '/AR/libs/three/jsm/GLTFLoader.js';
import { RGBELoader } from '/AR/libs/three/jsm/RGBELoader.js';
import { ARButton } from '/AR/libs/three/ARButton.js';
import { LoadingBar } from '/AR/libs/LoadingBar.js';



class App {
    constructor() {
        const container = document.createElement('div');
        document.body.appendChild(container);

        this.loadingBar = new LoadingBar();
        this.loadingBar.visible = false;

        this.assetsPath = "C:/xampp/htdocs/AR/assets/ar-shop/";

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
        this.camera.position.set(0, 1.6, 0);

        this.scene = new THREE.Scene();

        const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        ambient.position.set(0.5, 1, 0.25);
        this.scene.add(ambient);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(this.renderer.domElement);
        this.setEnvironment();

        this.reticle = new THREE.Mesh(
            new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial()
        );

        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);

        this.setupXR();

        window.addEventListener('resize', this.resize.bind(this));
    }

    setupXR() {
        this.renderer.xr.enabled = true;

        // TO DO 1: If navigator includes xr and immersive-ar is supported then show the ar-button class

        const self = this;

        this.hitTestSourceRequested = false;
        this.hitTestSource = null;

        function onSelect() {
            if (self.chair === undefined) return;

            if (self.reticle.visible) {
                self.chair.position.setFromMatrixPosition(self.reticle.matrix);
                self.chair.visible = true;
            }
        }

        this.controller = this.renderer.xr.getController(0);
        this.controller.addEventListener('select', onSelect);

        this.scene.add(this.controller);
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setEnvironment() {
        // Create a new RGBELoader instance
        hdrLoader.load('venice_sunset_1k.hdr', function (texture) {
            // Ensure this callback is being called
            console.log('HDR image loaded:', texture);
            // ... rest of your code
        });
        // Set data type
        hdrLoader.setDataType(THREE.UnsignedByteType);
        // Set the path to the HDR images
        hdrLoader.setPath('./assets/ar-shop/hdr/');

        // Load the HDR image
        hdrLoader.load('venice_sunset_1k.hdr', function (texture) {
            // Create a background using the HDR texture
            const background = new THREE.WebGLCubeRenderTarget(texture.image.height);
            background.fromEquirectangularTexture(this.renderer, texture);

            // Set the scene background
            this.scene.background = background;
        });
    }

    showChair(id) {
        this.initAR();

        const loader = new GLTFLoader().setPath(this.assetsPath);
        const self = this;

        this.loadingBar.visible = true;

        // Load a glTF resource
        loader.load(
            // resource URL
            `chair${id}.glb`,
            // called when the resource is loaded
            function (gltf) {

                self.scene.add(gltf.scene);
                self.chair = gltf.scene;

                self.chair.visible = false;

                self.loadingBar.visible = false;

                self.renderer.setAnimationLoop(self.render.bind(self));
            },
            // called while loading is progressing
            function (xhr) {

                self.loadingBar.progress = (xhr.loaded / xhr.total);

            },
            // called when loading has errors
            function (error) {

                console.log('An error happened');

            }
        );
    }

    initAR() {
        const self = this;
        if ('xr' in navigator) {
            navigator.xr.requestSession('immersive-ar').then((session) => {
                // Set up the AR session
                self.renderer.xr.setReferenceSpaceType('local');
                self.renderer.xr.setSession(session);
                // Additional AR setup goes here
                self.setupXR();
            }).catch((error) => {
                console.error('Error starting AR session:', error);
            });
        }
    }

    requestHitTestSource() {
        const self = this;

        const session = this.renderer.xr.getSession();

        session.requestReferenceSpace('viewer').then(function (referenceSpace) {

            session.requestHitTestSource({ space: referenceSpace }).then(function (source) {

                self.hitTestSource = source;

            });

        });

        session.addEventListener('end', function () {

            self.hitTestSourceRequested = false;
            self.hitTestSource = null;
            self.referenceSpace = null;

        });

        this.hitTestSourceRequested = true;

    }

    getHitTestResults(frame) {
        const hitTestResults = frame.getHitTestResults(this.hitTestSource);

        if (hitTestResults.length) {

            const referenceSpace = this.renderer.xr.getReferenceSpace();
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);

            this.reticle.visible = true;
            this.reticle.matrix.fromArray(pose.transform.matrix);

        } else {

            this.reticle.visible = false;

        }

    }

    render(timestamp, frame) {

        if (frame) {
            if (this.hitTestSourceRequested === false) this.requestHitTestSource()

            if (this.hitTestSource) this.getHitTestResults(frame);
        }

        this.renderer.render(this.scene, this.camera);

    }
}

export { App };