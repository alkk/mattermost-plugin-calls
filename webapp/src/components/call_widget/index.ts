import {GlobalState} from '@mattermost/types/store';
import {UserProfile} from '@mattermost/types/users';
import {IDMappedObjects} from '@mattermost/types/utilities';
import {Client4} from 'mattermost-redux/client';
import {getChannel} from 'mattermost-redux/selectors/entities/channels';
import {getTeam, getCurrentTeamId, getMyTeams} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {recordingPromptDismissedAt, showExpandedView, showScreenSourceModal, trackEvent} from 'src/actions';
import {
    sessionsInCurrentCall,
    callStartAtForCurrentCall,
    screenSharingIDForCurrentCall,
    expandedView,
    getChannelUrlAndDisplayName,
    allowScreenSharing,
    profilesInCurrentCall,
    hostIDForCurrentCall,
    hostChangeAtForCurrentCall,
    recordingForCurrentCall,
    sortedIncomingCalls,
    recentlyJoinedUsersInCurrentCall,
    sessionForCurrentCall,
} from 'src/selectors';
import {alphaSortSessions, stateSortSessions} from 'src/utils';

import CallWidget from './component';

const mapStateToProps = (state: GlobalState) => {
    // Using the channelID from the client since we could connect before
    // receiving the user connected event and still want to go ahead and show the widget.
    // Also, it would be possible to lose the event altogether if connecting to
    // the call while in a ws reconnection handler.
    const channel = getChannel(state, String(window.callsClient?.channelID));
    const currentUserID = getCurrentUserId(state);

    const screenSharingID = screenSharingIDForCurrentCall(state);

    const profiles = profilesInCurrentCall(state);

    const profilesMap: IDMappedObjects<UserProfile> = {};
    const picturesMap: {
        [key: string]: string,
    } = {};
    for (let i = 0; i < profiles.length; i++) {
        const pic = Client4.getProfilePictureUrl(profiles[i].id, profiles[i].last_picture_update);
        picturesMap[profiles[i].id] = pic;
        profilesMap[profiles[i].id] = profiles[i];
    }

    const sessions = sessionsInCurrentCall(state).sort(alphaSortSessions(profilesMap)).sort(stateSortSessions(screenSharingID, true));

    const {channelURL, channelDisplayName} = getChannelUrlAndDisplayName(state, channel);

    return {
        currentUserID,
        channel,
        team: getTeam(state, channel?.team_id || getCurrentTeamId(state)),
        channelURL,
        channelDisplayName,
        sessions,
        currentSession: sessionForCurrentCall(state),
        profilesMap,
        picturesMap,
        callStartAt: callStartAtForCurrentCall(state),
        callHostID: hostIDForCurrentCall(state),
        callHostChangeAt: hostChangeAtForCurrentCall(state),
        callRecording: recordingForCurrentCall(state),
        screenSharingID,
        allowScreenSharing: allowScreenSharing(state),
        show: !expandedView(state),
        recentlyJoinedUsers: recentlyJoinedUsersInCurrentCall(state),
        wider: getMyTeams(state)?.length > 1,
        callsIncoming: sortedIncomingCalls(state),
    };
};

const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators({
    showExpandedView,
    showScreenSourceModal,
    trackEvent,
    recordingPromptDismissedAt,
}, dispatch);

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(CallWidget));

