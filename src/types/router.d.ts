import "expo-router";

declare module "expo-router" {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      href: string | { pathname: string; params?: any };
    }
  }
}
