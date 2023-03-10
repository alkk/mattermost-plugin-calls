// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import styled, {css} from 'styled-components';
import {useSelector} from 'react-redux';

import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import {
    idToProfileInConnectedChannel,
    voiceReactions,
    voiceUsersStatuses,
} from 'src/selectors';
import {Emoji} from 'src/components/emoji/emoji';
import {getUserDisplayName} from 'src/utils';
import CompassIcon from 'src/components/icons/compassIcon';

interface Props {
    forceLeft?: boolean;
}

// add a list of reactions, on top of that add the hands up as the top element
export const ReactionStream = ({forceLeft}: Props) => {
    const currentUserID = useSelector(getCurrentUserId);

    const statuses = useSelector(voiceUsersStatuses);
    const profileMap = useSelector(idToProfileInConnectedChannel);

    const handsup = Object.keys(statuses)
        .flatMap((id) => (statuses[id]?.raised_hand ? [statuses[id]] : []))
        .sort((a, b) => a.raised_hand - b.raised_hand)
        .map((u) => u.id);

    const vReactions = useSelector(voiceReactions);
    const reversed = [...vReactions].reverse();
    const reactions = reversed.map((reaction) => {
        const emoji = (
            <Emoji
                emoji={reaction.emoji}
                size={14}
            />
        );
        const user = reaction.user_id === currentUserID ? 'You' : getUserDisplayName(profileMap[reaction.user_id], true) || 'Someone';
        return (
            <ReactionChip key={reaction.timestamp + reaction.user_id}>
                <span>{emoji}</span>
                <span>{user}</span>
            </ReactionChip>
        );
    });

    // add hands up
    let elements = [];
    const getName = (user_id: string) => {
        return user_id === currentUserID ? 'You' : getUserDisplayName(profileMap[user_id], true);
    };
    let participants: string;
    if (handsup?.length) {
        switch (handsup?.length) {
        case 1:
            participants = `${getName(handsup[0])}`;
            break;
        case 2:
            participants = `${getName(handsup[0])} & ${getName(handsup[1])}`;
            break;
        case 3:
            participants = `${getName(handsup[0])}, ${getName(handsup[1])} & ${getName(handsup[2])}`;
            break;
        default:
            participants = `${getName(handsup[0])}, ${getName(handsup[1])} & ${handsup?.length - 2} others`;
            break;
        }

        elements.push(
            <ReactionChip
                key={'hands'}
                highlight={true}
            >
                <CompassIcon
                    icon={'hand-right'}
                    style={{
                        color: 'rgb(255, 188, 66)',
                        marginBottom: 2,
                        fontSize: 14,
                    }}
                />
                <Bold>{participants}</Bold>
                <span>{' raised a hand'}</span>
            </ReactionChip>);
    }

    elements = [...elements, ...reactions];

    return (
        <ReactionStreamList forceLeft={forceLeft}>
            {elements}
        </ReactionStreamList>
    );
};

interface streamListStyleProps {
    forceLeft?: boolean;
}

const ReactionStreamList = styled.div<streamListStyleProps>`
    position: absolute;
    align-self: flex-end;
    height: 75vh;
    display: flex;
    flex-direction: column-reverse;
    z-index: 1;
    margin: 12px;
    gap: 8px;
    -webkit-mask: -webkit-gradient(#0000, #000);
    mask: linear-gradient(#0000, #0003, #000f);
    ${(props) => props.forceLeft && css`
        left: 12px;
    `}
`;

interface chipProps {
    highlight?: boolean;
}

const ReactionChip = styled.div<chipProps>`
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 4px 12px 4px 6px;
    gap: 5px;
    max-height: 24px;
    color: var(--button-color);
    background: rgba(var(--button-color-rgb), 0.16);
    border-radius: 16px;
    width: fit-content;
    font-weight: 600;
    font-size: 12px;
    line-height: 20px;

    ${(props) => props.highlight && css`
        background: #FFFFFF;
        color: #090A0B;
  `}
`;

const Bold = styled.span`
    font-weight: 600;
`;
