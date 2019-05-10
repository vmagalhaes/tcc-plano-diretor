/*
 * Extra typings definitions
 */

// Allow .json files imports
declare module '*.json';

// SystemJS module definition
declare var module: NodeModule;
interface NodeModule {
  id: string;
}

declare namespace L {
  namespace control {
    function mousePosition(options: any);
    function measure(options: any);
    function legends(options: any);
    function layersContainer(options: any);
  }

  namespace Control {
    class Legends {
      constructor(options?: any)
    }

    class LayersContainer {
      constructor(options?: any)
    }
  }
}