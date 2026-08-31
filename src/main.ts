
import { debug, error } from './utils/logger';
import { loadApis, sources } from './api/main-api';
import '@/ym_styles.scss'
import '@/styles.module.scss'
import { invokeAddNodesListeners } from './hooks/ui/observer';
import { prepareBadges } from './hooks/ui/badges';
import { prepareTutorials } from './hooks/ui/tutorial';
import { prepareOptions } from './hooks/ui/options';
import { prepareDisabledTracksObserver } from './hooks/ui/disabled-tracks';
import { hookResources } from './hooks/resources';
import { hookPlayer } from './hooks/player';
import { prepeareButtons } from './hooks/ui/buttons';
import postNotification from './ui/notifications';
import { appRequire } from './utils/hook-utils';

function prepareUiHooks() {
    prepareBadges()
    prepareTutorials()
    prepareOptions();
    prepareDisabledTracksObserver();
    //prepeareButtons();
}

function hookDiHooks() {
    hookResources();
    hookPlayer();
}

function prepareHooks() {
    hookDiHooks();
    prepareUiHooks();
}

debug("Starting")
prepareHooks();
loadApis().then(() => { 
    invokeAddNodesListeners();
})   