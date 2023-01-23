// @ts-ignore
const customIcons = require.context('../../resources/custom', false, /\.svg$/)
// @ts-ignore
const materialIcons = require.context('../../node_modules/@material-design-icons/svg/filled', false, /\.svg$/)
// @ts-ignore
const fontAwesome = require.context('../../node_modules/@fortawesome/fontawesome-free/svgs', true, /\.svg$/)

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { Colors } from './colors';
const svgLoader = new SVGLoader();

const ICON_MATERIAL = new THREE.MeshBasicMaterial({
    color: Colors.text,
    side: THREE.DoubleSide,
});

const domParser = new DOMParser();

function viewBoxFromSVG(svg: string){
    let [, dataType, , b64] = svg.split(/[:;,]/)
    let parsedDom = domParser.parseFromString(window.atob(b64), 'image/svg+xml')
    let attribute = parsedDom.documentElement.getAttribute('viewBox');
    return attribute?.split(' ').map(el => Number(el))
}

function iconFromName(name?: string | boolean | (() => string), scale: number = 1) {
    if (typeof name === 'function') {
        name = name()
    }

    let svg: string | null = null;
    if (name == undefined) {
        // Missing
        // TODO Node on null?
        svg = materialIcons('./help_outline.svg');
    } else if (typeof name === 'boolean') {
        // Boolean
        svg = materialIcons(name ? './check_box.svg' : './check_box_outline_blank.svg');
    } else if (name.match(/^(fa[.-])|(fa[rsb]\.)/)) {
        // Font Awesome
        if (name.startsWith('far')) {
            svg = fontAwesome(`./regular/${name.substring(4)}.svg`);
        } else if (name.startsWith('fas')) {
            svg = fontAwesome(`./solid/${name.substring(4)}.svg`);
        } else if (name.startsWith('fab')) {
            svg = fontAwesome(`./brands/${name.substring(4)}.svg`);
        } else { 
            svg = fontAwesome(`./regular/${name.substring(3)}.svg`);
        }
    } else if (name.substring(0, 5) === 'icon-') {
        // Custom Icons
        svg = customIcons(`./${name}.svg`);
    } else if (name.substring(0, 14) === 'data:image/png') {
        // Data URL
    } else {
        svg = materialIcons(`./${name}.svg`);
        // Material Icon
    }

    if (svg == null) {
        svg = materialIcons('./help_outline.svg');
    }

    let [x1, y1, x2, y2] = viewBoxFromSVG(svg as string) as number[];
    let centerX = (x1 + x2) / 2;
    let centerY = (y1 + y2) / 2;
    let width = x2 - x1;
    let height = y2 - y1;
    let scaleFactor = height;

    const iconGroup = new THREE.Group();
    svgLoader.load(svg as string, (data) => {
        const paths = data.paths;

        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            const shapes = SVGLoader.createShapes(path);

            for (let j = 0; j < shapes.length; j++) {
                const shape = shapes[j];
                const geometry = new THREE.ShapeGeometry(shape);
                const mesh = new THREE.Mesh(geometry, ICON_MATERIAL);
                mesh.position.x = -centerX;
                mesh.position.y = -centerY;
                iconGroup.add(mesh);
            }
        }
    });

    iconGroup.scale.setScalar(scale / scaleFactor);
    iconGroup.rotateZ(Math.PI);

    return iconGroup;
}

export { iconFromName }