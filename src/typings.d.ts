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
    function mousePosition();
    function measure(options: any);
  }
}