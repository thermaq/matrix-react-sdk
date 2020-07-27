/*
Copyright 2020 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, {useContext, useEffect, useRef, useState} from "react";
import MatrixClient from "matrix-js-sdk/src/client";

import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import {_t} from "../../../../../languageHandler";
import SettingsSection from "../../SettingsSection";
import {ContentRules} from "../../../../../notifications";
import DesktopNotificationsSection from "../../notifications/DesktopNotificationsSection";
import EmailNotificationsSection from "../../notifications/EmailNotificationsSection";
import AppearanceSoundsSection from "../../notifications/AppearanceSoundsSection";
import {useAccountData} from "../../../../../hooks/useAccountData";
import MentionsKeywordsSection from "../../notifications/MentionsKeywordsSection";
import {compareNotificationSettings, IRuleSets, NotificationSetting} from "../../../../../notifications/types";
import RoomOverridesSection from "../../notifications/RoomOverridesSection";
import StyledRadioGroup from "../../../elements/StyledRadioGroup";
import {State} from "../../../../../notifications/PushRuleVectorState";
import AdvancedNotificationsSection from "../../notifications/AdvancedNotificationsSection";
import {
    EVENT_NOTIFY_ME_WITH_CHANGED,
    PushRuleMap,
    writeNotifyMeWith
} from "../../../../../notifications/NotificationUtils";
import {useEventEmitter} from "../../../../../hooks/useEventEmitter";

const NotificationUserSettingsTab2: React.FC = () => {
    const cli = useContext<MatrixClient>(MatrixClientContext);
    const pushRules = useAccountData<IRuleSets>(cli, "m.push_rules");

    const pushRulesMap = useRef(new PushRuleMap(pushRules.global));

    useEffect(() => {
        pushRulesMap.current.setPushRules(pushRules.global);
    }, [pushRules]);

    const [notifyMeWith, setNotifyMeWith] = useState<NotificationSetting>(pushRulesMap.current.notifyMeWith);
    useEventEmitter(pushRulesMap.current, EVENT_NOTIFY_ME_WITH_CHANGED, setNotifyMeWith);

    const contentRules = ContentRules.parseContentRules(pushRules);
    const [keywordsEnabled, setKeywordsEnabled] = useState(contentRules.vectorState !== State.Off);

    // TODO wire up playSoundFor
    const [playSoundFor, setPlaySoundFor] = useState<NotificationSetting>(NotificationSetting.MentionsKeywordsOnly);

    const onPlaySoundForChange = (value: NotificationSetting) => {
        setPlaySoundFor(value);
        // TODO update push rules including all keywords
        const soundEnabled = compareNotificationSettings(value, NotificationSetting.Never) > 0;
        ContentRules.updateContentRules(cli, contentRules, keywordsEnabled, soundEnabled); // TODO error handling
    };

    if (!pushRulesMap) return null;

    const onNotifyMeWithChange = (value: NotificationSetting) => {
        setNotifyMeWith(value);
        writeNotifyMeWith(cli, pushRulesMap.current, value).catch(e => {
            console.log(e); // TODO error handling
        });
    };

    const mentionsKeywordsSectionDisabled = notifyMeWith === NotificationSetting.Never;

    return <div className="mx_SettingsTab mx_NotificationsTab">
        <div className="mx_SettingsTab_heading">{_t("Notifications")}</div>
        <div className="mx_SettingsTab_subsectionText">
            {_t("Manage notifications across all rooms...")}
        </div>

        <SettingsSection title={_t("Notify me with")}>
            <StyledRadioGroup
                name="notifyMeWith"
                value={notifyMeWith}
                onChange={onNotifyMeWithChange}
                definitions={[
                    {
                        value: NotificationSetting.AllMessages,
                        label: _t("All messages"),
                    }, {
                        value: NotificationSetting.DirectMessagesMentionsKeywords,
                        label: _t("Direct messages, mentions & keywords"),
                    }, {
                        value: NotificationSetting.MentionsKeywordsOnly,
                        label: _t("Mentions & keywords only"),
                    }, {
                        value: NotificationSetting.Never,
                        label: _t("Never"),
                    },
                ]}
            />
        </SettingsSection>

        <MentionsKeywordsSection
            disabled={mentionsKeywordsSectionDisabled}
            pushRules={pushRulesMap.current}
            contentRules={contentRules}
            keywordsEnabled={keywordsEnabled}
            setKeywordsEnabled={setKeywordsEnabled}
            soundEnabled={compareNotificationSettings(playSoundFor, NotificationSetting.Never) > 0}
        />

        <AppearanceSoundsSection
            notifyMeWith={notifyMeWith}
            playSoundFor={playSoundFor}
            onChange={onPlaySoundForChange}
        />

        <RoomOverridesSection notifyMeWith={notifyMeWith} pushRules={pushRulesMap.current} />

        <DesktopNotificationsSection />

        <EmailNotificationsSection />

        <AdvancedNotificationsSection rules={[...contentRules.externalRules]} />
    </div>;
};

export default NotificationUserSettingsTab2;
