import VolvoOnCall from "../VolvoOnCall";
import fetch from "node-fetch";
import deepmerge = require("deepmerge");


type RestRequestOptions = {
    method?: "GET" | "POST" | "DELETE" | string;
    json?: any;
    headers?: Record<string, string>;
}

export default class RESTController {
    public onCall: VolvoOnCall;
    public baseApiUrl: string;
    public authKey: string | null;

    constructor (onCall: VolvoOnCall, region: string) {
        this.onCall = onCall;
        this.baseApiUrl = `https://vocapi${region !== "eu" ? `-${region}` : ""}.wirelesscar.net/customerapi/rest/v3.0/`;
        this.authKey = null;
    }

    /**
     * Gets default headers for the rest controller, including authorization header
     * @returns {{Authorization: string, "X-OS-Version": string, "X-Device-Id": string, "X-OS-Type": string, "User-Agent": string, "cache-control": string, "X-Originator-Type": string, "Content-Type": string, accept: string}}
     */
    public getDefaultHeaders () {
        if (!this.authKey) {
            throw new Error(`Attempted to retrieve default headers and authKey is not set on rest controller!`);
        }

        return {
            "User-Agent": "yes",
            "X-Device-Id": "Device",
            "X-OS-Type": "Android",
            "X-Originator-Type": "App",
            "X-OS-Version": "22",
            "cache-control": "no-cache",
            "Content-Type": "application/json",
            accept: "*/*",
            Authorization: `Basic ${this.authKey}`
        };
    }

    /**
     * Constructs a complete API url from the additional path. Will merge the base api url with the path provided
     * @param {string} path
     * @param {string} replaceBaseUrl
     * @returns {string}
     */
    public constructUrl (path: string, replaceBaseUrl?: string) {
        return `${replaceBaseUrl || this.baseApiUrl}${path}`;
    }

    /**
     * Sends a HTTP request
     * @param {string} path
     * @param {RestRequestOptions} options
     * @returns {Promise<any>}
     */
    public async request (path: string, options: RestRequestOptions): Promise<any> {
        const requestOptions = {
            headers: deepmerge({
                ...this.getDefaultHeaders()
            }, options.headers || {}),
            method: options.method || "POST",
            body: options.method !== "GET" ? JSON.stringify(options.json) : undefined
        };

        return fetch(
            this.constructUrl(path),
            requestOptions
        )
            .then(response => {
                if (response.status >= 200 && response.status <= 299) {
                    return response.json();
                } else {
                    throw new Error(`Failed to send request to ${path}`);
                }
            });
    }

    /**
     * Converts a string to base 64 using buffer.from
     * @param {string} input
     * @returns {string}
     */
    public convertToBase64 (input: string): string {
        return Buffer.from(input)
            .toString("base64");
    }

    /**
     * Converts a base64 string to a "regular" string using buffer.from
     * @param {string} input
     * @returns {string}
     */
    public convertFromBase64 (input: string): string {
        return Buffer.from(input)
            .toString("utf8");
    }
}
