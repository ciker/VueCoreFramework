﻿import Oidc from 'oidc-client';
import * as Api from './api';
import * as Store from './store/store';
import { PermissionData } from './store/userStore';
import { router } from './router';
import { JL } from 'jsnlog';
import * as ErrorMsg from './error-msg';

export let authMgr: Oidc.UserManager;
let config: Oidc.UserManagerSettings;
export function configureOidc() {
    Oidc.Log.level = Oidc.Log.WARN;
    Oidc.Log.logger = JL("OIDC");
    config = {
        authority: Api.urls.authUrl,
        client_id: "vue.client",
        redirect_uri: `${Api.urls.spaUrl}oidc/callback`,
        response_type: "id_token token",
        scope: "openid profile roles vcfapi",
        prompt: "none",
        post_logout_redirect_uri: Api.urls.spaUrl,
        userStore: new Oidc.WebStorageStateStore({ store: window.localStorage })
    };
    authMgr = new Oidc.UserManager(config);
    authMgr.events.addAccessTokenExpiring(authorize);
}

async function authorize(): Promise<string> {
    try {
        let request = await authMgr.createSigninRequest();
        request.url = request.url.substring(Api.urls.authUrl.length);
        request.url += '&response_mode=form_post';

        let response = await Api.getAuth(request.url);
        if (!response.ok) {
            throw new Error(`Authorization endpoint call failure: ${response.status}, ${response.statusText}`);
        }
        let text = await response.text();

        let regex = /name='([^']+)' value='([^']+)'/g;
        let parsed: RegExpExecArray;
        let fake_url = '';
        while (parsed = regex.exec(text)) {
            fake_url += `&${parsed[1]}=${parsed[2]}`;
        }

        let user = await authMgr.signinRedirectCallback(fake_url);
        if (user) {
            Store.store.commit(Store.setUser, user);
            return "authorized";
        } else {
            throw new Error("Authorization callback failure.");
        }
    } catch (error) {
        ErrorMsg.logError("authorization.authorize", error);
        return "login";
    }
}

export async function login(returnUrl = ''): Promise<string> {
    try {
        let result = await authorize();
        if (result === "authorized") {
            if (returnUrl) {
                router.push(returnUrl);
            } else {
                router.push('/');
            }
            return "Success";
        } else {
            return "A problem occurred. Login failed.";
        }
    } catch (error) {
        ErrorMsg.logError("authorization.login", error);
        return "A problem occurred. Login failed.";
    }
}

export async function logout(): Promise<Response> {
    Store.store.commit(Store.logout);
    await authMgr.removeUser();
    return Api.getAuth('Account/Logout');
}

/**
 * Authenticates the current user.
 * @returns {string} Either 'authorized' or 'login' if the user must sign in.
 */
export async function authenticate(full?: boolean): Promise<string> {
    try {
        if (Store.store.state.userState.user) {
            return "authorized";
        } else {
            return authorize();
        }
    } catch (error) {
        ErrorMsg.logError("authorization.authenticate", new Error(error));
        return "login";
    }
}

/**
 * A ViewModel used to transfer information during user account authorization tasks.
 */
export interface AuthorizationViewModel {
    /**
     * A value indicating the user's level of authorization for the requested data.
     */
    authorization: string;

    /**
     * Indicates whether the user is authorized to share/hide the requested data with anyone, their group, or no one.
     */
    canShare: string;
}

/**
 * Calls an API endpoint which authorizes the current user for the data indicated.
 * @param {string} dataType The type of data requested.
 * @param {string} operation The type of operation to be performed on the data.
 * @param {string} id The primary key of the data item requested.
 * @returns {string} Either 'authorized' or 'unauthorized' or 'login' if the user must sign in.
 */
export async function checkAuthorization(dataType: string, operation = '', id = ''): Promise<string> {
    try {
        let user = await authMgr.getUser();
        let authorizeResult;
        if (!user || !Store.store.state.userState.user) {
            authorizeResult = await authorize();
        } else {
            authorizeResult = "authorized";
        }
        if (authorizeResult === "login") {
            return authorizeResult;
        } else {
            let url = `Authorization/Authorize/${dataType}`;
            if (operation) url += `?operation=${operation}`;
            if (id) {
                if (operation) {
                    url += '&';
                } else {
                    url += '?';
                }
                url += `id=${id}`;
            }
            let response = await Api.getAuth(url);
            if (!response.ok) {
                if (response.status === 401) {
                    throw Error("unauthorized");
                }
                throw Error(response.statusText);
            }
            let data = await response.json() as AuthorizationViewModel;
            if (data.authorization === "login") {
                return "login";
            }
            let permission: PermissionData = { dataType };
            if (id) {
                permission.id = id;
            }
            permission.canShare = data.canShare;
            if (data.authorization !== "authorized"
                && data.authorization !== "unauthorized") {
                permission.permission = data.authorization;
            }
            Store.store.commit(Store.updatePermission, permission);
            return data.authorization;
        }
    } catch (error) {
        if (error.message === "unauthorized") {
            return error.message;
        } else {
            ErrorMsg.logError("authorization.checkAuthorization", error);
            return "login";
        }
    }
}
