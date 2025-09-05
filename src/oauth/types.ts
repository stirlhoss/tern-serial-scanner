import type { CustomResponse } from "@solidjs/router";
import type { Provider } from "./providers";

export interface Identifiers {
    id: string;
    secret: string;
    accountId?: string;
}

export interface User {
    email: string;
    accessToken?: string;
    refreshToken?: string;
}

export type Configuration = Partial<Record<Provider, Identifiers>> & {
    password: string;
    handler: (
        email: string,
        accessToken: string,
        refreshToken: string,
        redirectTo?: string,
    ) => Promise<CustomResponse<never>>;
};

export type Token = Promise<{
    token_type: string;
    access_token: string;
    refresh_token: string;
}>;

export interface Methods {
    requestCode(
        params: Pick<Identifiers, "id"> & {
            accountId: string;
            redirect_uri: string;
            state: string;
            challenge: string;
        },
    ): string;
    requestToken(
        params: Identifiers & {
            accountId: string;
            redirect_uri: string;
            code: string;
            verifier: string;
        },
    ): Token;
    requestUser(token: string, accountId: string): Promise<User>;
}
