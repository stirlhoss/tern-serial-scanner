import { urlEncode, exchangeToken, fetchUser } from "../utils";
import type { Methods } from "../types";

const userinfoUrl = process.env.NETSUITE_USER_INFO_URL!;

const netsuite: Methods = {
    requestCode({ id, accountId, redirect_uri, state, challenge }) {
        const params = urlEncode({
            scope: "restlets rest_webservices",
            redirect_uri,
            response_type: "code",
            client_id: id,
            state,
            code_challenge: challenge,
            code_challenge_method: "S256",
        });

        return (
            `https://${accountId}.app.netsuite.com/app/login/oauth2/authorize.nl?` +
            params
        );
    },
    async requestToken({
        id,
        secret,
        code,
        accountId,
        redirect_uri,
        verifier,
    }) {
        return exchangeToken(
            `https://${accountId}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`,
            { id, secret },
            code,
            redirect_uri,
            verifier,
        );
    },
    async requestUser(token: string) {
        const res = await fetchUser(userinfoUrl, token);

        const { name, email } = res;
        return {
            name,
            email,
            accessToken: token,
        };
    },
};

export default netsuite;
