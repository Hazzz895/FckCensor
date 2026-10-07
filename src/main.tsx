
import { debug } from './utils/logger';
import { loadSources } from './api/main-api';
import '@/ym_styles.scss'
import '@/styles.module.scss'
import { invokeAddNodesListeners } from './hooks/ui/observer';
import { prepareBadges } from './hooks/ui/badges';
import { prepareTutorials } from './hooks/ui/tutorial';
import { prepareOptions } from './hooks/ui/options';
import { prepareDisabledTracksObserver } from './hooks/ui/disabled-tracks';
import { hookPlayer } from './hooks/player';
import { toggleLiteMode } from './hooks/resources';
import "./api/reports-api";
import "./utils/hook-utils";
import { listenSettings, prepareSettings } from './utils/pulsesync';
import { prepareSettingsOptions } from './hooks/ui/settings';

function prepareUiHooks() {
    prepareBadges();
    prepareTutorials();
    prepareOptions();
    prepareDisabledTracksObserver();
    prepareSettingsOptions();
    //prepeareButtons();
}

function prepareHooks() {
    hookPlayer();
    prepareUiHooks();
}

debug("Starting")
listenSettings(toggleLiteMode, "lite_mode")
prepareSettings();
prepareHooks();
loadSources().then(() => { 
    invokeAddNodesListeners();
})