import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

// https://www.w3.org/TR/webxr-gamepads-module-1/#xr-standard-gamepad-mapping
const DEFAUL_AXES_MAPPING = {
    touchpadX: 0,  // Missing on quest 2
    touchpadY: 1,  // Missing on quest 2
    thumbstickX: 2,
    thumbstickY: 3,
}

const DEFAULT_BUTTON_MAPPING = {
    trigger: 0,
    grip: 1,
    touchpad: 2, // Missing on quest 2
    thumbstick: 3,
    ax: 4, // Present on quest 2
    by: 5, // Present on quest 2
}

const CONTROLLER_MODEL_FACTORY = new XRControllerModelFactory();

class Controller {
    constructor(index, renderer, parentObject = null, buttonMapping = DEFAULT_BUTTON_MAPPING, axesMapping = DEFAUL_AXES_MAPPING) {
        this._buttonMapping = buttonMapping;
        this._axesMapping = axesMapping;

        this._controllerGrip = renderer.xr.getControllerGrip(index);
        this._controllerGrip.add(CONTROLLER_MODEL_FACTORY.createControllerModel(this._controllerGrip));
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

        this.update();
    }

    get buttons() {
        if (this._gamepad === undefined)
            return null;

        let buttons = {};
        for (const [key, index] of Object.entries(this._buttonMapping)) {
            buttons[key] = this._gamepad.buttons[index];
        }
        return buttons;
    }

    get axes() {
        if (this._gamepad === undefined)
            return null;

        let axes = {};
        for (const [key, index] of Object.entries(this._axesMapping)) {
            axes[key] = this._gamepad.axes[index];
        }
        return axes;

    }

    get thumbstickPosition() { }

    get isSelecting() { return this._isSelecting }

    get isSqueezing() { return this._isSqueezing; }

    // mainly for pointing like UI interaction
    get position() { return this._controller.position; }

    get lastPosition() { return this._lastPosition; }

    // for holding things
    get gripPosition() { return this._controllerGrip.position; }

    get lastGripPosition() { return this._lastGripPosition; }

    get connected() { return this._connected; }

    get handedness() { return this._handedness; }

    update() {
        this._lastPosition = this._controller.position.clone();
        this._lastGripPosition = this._controllerGrip.position.clone();
    }
}

export { Controller }