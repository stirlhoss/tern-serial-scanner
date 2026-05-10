export { makeState, decodeState } from "./state";
export { exchangeToken, fetchUser, urlEncode } from "./helpers";

export function parseError(error: unknown) {
    if (error !== null && typeof error === "object" && !(error instanceof Error)) {
        return encodeURIComponent(JSON.stringify(error));
    }
    const raw = error instanceof Error ? error.message : String(error);
    try {
        const { error_description, error: parsedError } = JSON.parse(raw);
        return encodeURIComponent(error_description ?? parsedError ?? raw);
    } catch {
        return encodeURIComponent(raw);
    }
}
