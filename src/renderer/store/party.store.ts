// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

//import { me } from "@renderer/store/me.store";
import { PartyInvitedEventData, PartyRemovedEventData, PartyUpdatedEventData, PartyId, UserId, UnixTime, PartyState } from "tachyon-protocol/types";
import { reactive } from "vue";

export const partyStore = reactive<{
    isInitialized: boolean;
    errorMessage: string | null;
    partyState: PartyState | null;
    members: PartyMember[];
    inviteList: InvitedUser[];
}>({
    isInitialized: false,
    errorMessage: null,
    partyState: null,
    members: [],
    inviteList: [],
});

interface PartyMember {
    userId: UserId;
    joinedAt: UnixTime;
}
interface InvitedUser {
    userId: UserId;
    invitedAt: UnixTime;
}

async function sendAcceptInviteRequest(partyId: PartyId) {
    try {
        const response = await window.tachyon.request("party/acceptInvite", { partyId: partyId });
        console.log("Tachyon: party/acceptInvite response:", response);
    } catch (error) {
        console.error("Tachyon error: party/acceptInvite:", error);
        partyStore.errorMessage = "Error: party/acceptInvite failed";
    }
}

async function sendCancelInviteRequest(userId: UserId) {
    try {
        const response = await window.tachyon.request("party/cancelInvite", { userId: userId });
        console.log("Tachyon: party/cancelInvite:", response);
    } catch (error) {
        console.error("Tachyon error: party/cancelInvite:", error);
        partyStore.errorMessage = "Error: party/cancelInvite failed";
    }
}

async function sendCreateRequest() {
    try {
        const response = await window.tachyon.request("party/create");
        console.log("Tachyon: party/create:", response);
    } catch (error) {
        console.error("Tachyon error: party/create:", error);
        partyStore.errorMessage = "Error: party/create failed";
    }
}

async function sendDeclineInviteRequest(partyId: PartyId) {
    try {
        const response = await window.tachyon.request("party/declineInvite", { partyId: partyId });
        console.log("Tachyon: party/declineInvite:", response);
    } catch (error) {
        console.error("Tachyon error: party/declineInvite:", error);
        partyStore.errorMessage = "Error: party/declineInvite failed";
    }
}

async function sendInviteRequest(userId: UserId) {
    try {
        const response = await window.tachyon.request("party/invite", { userId: userId });
        console.log("Tachyon: party/invite:", response);
    } catch (error) {
        console.error("Tachyon error: party/invite:", error);
        partyStore.errorMessage = "Error: party/invite failed";
    }
}

async function sendKickMemberRequest(userId: UserId) {
    try {
        const response = window.tachyon.request("party/kickMember", { userId: userId });
        console.log("Tachyon: party/kickMember:", response);
    } catch (error) {
        console.error("Tachyon error: party/kickMember:", error);
        partyStore.errorMessage = "Error: party/kickMember failed";
    }
}

async function sendLeaveRequest() {
    try {
        const response = window.tachyon.request("party/leave");
        console.log("Tachyon: party/leave:", response);
    } catch (error) {
        console.error("Tachyon error: party/leave:", error);
        partyStore.errorMessage = "Error: party/leave failed";
    }
}

function onInvitedEvent(data: PartyInvitedEventData) {
    console.log("Tachyon: party/invited:", data);
}

function onRemovedEvent(data: PartyRemovedEventData) {
    console.log("Tachyon: party/removed:", data);
}

function onUpdatedEvent(data: PartyUpdatedEventData) {
    console.log("Tachyon: party/updated:", data);
}

export async function initPartyStore() {
    if (partyStore.isInitialized) return;

    window.tachyon.onEvent("party/invited", (data) => {
        onInvitedEvent(data);
    });

    window.tachyon.onEvent("party/removed", (data) => {
        onRemovedEvent(data);
    });
    window.tachyon.onEvent("party/updated", (data) => {
        onUpdatedEvent(data);
    });

    partyStore.isInitialized = true;
}

export const party = { sendAcceptInviteRequest, sendCancelInviteRequest, sendCreateRequest, sendDeclineInviteRequest, sendInviteRequest, sendKickMemberRequest, sendLeaveRequest };
