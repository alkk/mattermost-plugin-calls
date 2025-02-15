// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

declare global {
    interface Window {
        callsClient: any,
        isHandRaised: boolean;
        e2eDesktopNotificationsRejected?: DesktopNotificationArgs[],
        e2eDesktopNotificationsSent?: string[],
        e2eNotificationsSoundedAt?: number[],
        e2eNotificationsSoundStoppedAt?: number[],
        e2eRingLength?: number,
        plugins: any,

        // Desktop Mocking
        desktop: any,
        desktopAPI: any,
        getAppInfo: () => void,
        openScreenShareModal: () => void,
        onCallsError: () => void,
        onScreenShared: () => void,
        sendCallsError: () => void,
        leaveCall: () => void,
        getDesktopSources: () => DesktopSource[],
    }
}

export type DesktopSource = {
    id: string;
    name: string;
    thumbnailURL: string;
};

export type UserState = {
    username: string;
    password: string;
    storageStatePath: string;
};

export type DesktopNotificationArgs = {
    title: string;
    body: string;
    silent: boolean;
    soundName: string;
    url: string;
    notify: boolean;
};

export type DesktopAPICalls = {
    getAppInfo: boolean;
    onCallsError: boolean;
    openScreenShareModal: boolean;
    onScreenShared: boolean;
    sendCallsError: boolean;
    leaveCall: boolean;
};
