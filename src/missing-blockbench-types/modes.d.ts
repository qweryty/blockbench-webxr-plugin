declare class Mode extends KeybindItem {
}

declare const Modes: {
    get id(): string;
    selected: boolean | any;  // TODO
    options: {};
    vue: Vue;
    [id: string]: Mode;
}