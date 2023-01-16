import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory';

type Axes = {
    touchpadX: number,
    touchpadY: number,
    thumbstickX: number,
    thumbstickY: number,
}

type AxesMapping = {
    touchpadX: number,
    touchpadY: number,
    thumbstickX: number,
    thumbstickY: number,
};

type Buttons = {
    trigger: GamepadButton,
    grip: GamepadButton,
    touchpad: GamepadButton,
    thumbstick: GamepadButton,
    ax: GamepadButton,
    by: GamepadButton,
}

type ButtonMapping = {
    trigger: number,
    grip: number,
    touchpad: number,
    thumbstick: number,
    ax: number,
    by: number,
}

// https://www.w3.org/TR/webxr-gamepads-module-1/#xr-standard-gamepad-mapping
const DEFAUL_AXES_MAPPING: AxesMapping = {
    touchpadX: 0,  // Missing on quest 2
    touchpadY: 1,  // Missing on quest 2
    thumbstickX: 2,
    thumbstickY: 3,
}

const DEFAULT_BUTTON_MAPPING: ButtonMapping = {
    trigger: 0,
    grip: 1,
    touchpad: 2, // Missing on quest 2
    thumbstick: 3,
    ax: 4, // Present on quest 2
    by: 5, // Present on quest 2
}

const CONTROLLER_MODEL_FACTORY = new XRControllerModelFactory();

class Controller {
    _buttonMapping: ButtonMapping
    _axesMapping: AxesMapping
    _controllerGrip: THREE.XRGripSpace
    _controller: THREE.XRTargetRaySpace
    _isSqueezing: boolean
    _isSelecting: boolean
    _connected: boolean
    _handedness: string | null
    _gamepad?: Gamepad
    _lastGripPosition: THREE.Vector3
    _lastPosition: THREE.Vector3

    constructor(
        index: number,
        renderer: THREE.WebGLRenderer,
        parentObject?: THREE.Object3D,
        buttonMapping: ButtonMapping = DEFAULT_BUTTON_MAPPING,
        axesMapping: AxesMapping = DEFAUL_AXES_MAPPING
    ) {
        this._buttonMapping = buttonMapping;
        this._axesMapping = axesMapping;

        this._controllerGrip = renderer.xr.getControllerGrip(index);
        this._controllerGrip.add(CONTROLLER_MODEL_FACTORY.createControllerModel(this._controllerGrip));
        if (parentObject != null)
            parentObject.add(this._controllerGrip);
        this._controller = renderer.xr.getController(index);

        this._isSqueezing = false;
        this._isSelecting = false;
        this._connected = false;
        this._handedness = null;

        this._controller.addEventListener('selectstart', () => this._isSelecting = true);
        this._controller.addEventListener('selectend', () => this._isSelecting = false);
        this._controller.addEventListener('squeezestart', () => this._isSqueezing = true);
        this._controller.addEventListener('squeezeend', () => this._isSqueezing = false);
        this._controller.addEventListener('connected', (e) => {
            console.log(`connected: ${JSON.stringify(e)} ${e.data.gamepad} ${e.data.handedness}`)
            this._connected = true;
            this._gamepad = e.data.gamepad;
            this._handedness = e.data.handedness;
        });
        this._controller.addEventListener('disconnected', (e) => { this._connected = false });

        this._lastPosition = new THREE.Vector3();
        this._lastGripPosition = new THREE.Vector3();
        this.update();
    }

    get buttons(): Buttons | null {
        if (this._gamepad == null)
            return null;

        let buttons: { [key: string]: GamepadButton } = {};
        for (const [key, index] of Object.entries(this._buttonMapping)) {
            buttons[key] = this._gamepad.buttons[index];
        }
        return buttons as Buttons;
    }

    get axes(): Axes | null {
        if (this._gamepad == null)
            return null;

        let axes: { [key: string]: number } = {};
        for (const [key, index] of Object.entries(this._axesMapping)) {
            axes[key] = this._gamepad.axes[index];
        }
        return axes as Axes;
    }

    get thumbstickPosition() {
        return [
            this._gamepad?.axes[this._axesMapping.thumbstickX].valueOf(),
            this._gamepad?.axes[this._axesMapping.thumbstickY].valueOf()
        ]
    }

    get isSelecting(): boolean { return this._isSelecting }

    get isSqueezing(): boolean { return this._isSqueezing; }

    // mainly for pointing like UI interaction; equivalent to targetRaySpace
    get position(): THREE.Vector3 { return this._controller.position; }

    get lastPosition(): THREE.Vector3 { return this._lastPosition; }

    // for holding things
    get gripPosition(): THREE.Vector3 { return this._controllerGrip.position; }

    get lastGripPosition(): THREE.Vector3 { return this._lastGripPosition; }

    get connected(): boolean { return this._connected; }

    get handedness(): string | null { return this._handedness; }

    update() {
        this._lastPosition.copy(this._controller.position);
        this._lastGripPosition.copy(this._controllerGrip.position);
    }
}

export { Controller }