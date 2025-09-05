import netsuite from "./netsuite";

export const providers = {
    netsuite,
} as const;

export const isProvider = (str: string): str is Provider =>
    Object.hasOwn(providers, str);

export type Provider = keyof typeof providers;
