(function() {
    const ADDON_NAME = "FckCensor";
    function log(...args) {
        console.debug("[" + ADDON_NAME + "]", ...args);
    }

    /* == получение метода require из webpack == */
    const webpackGlobal = window.webpackChunk_N_E;
    let appRequire = null;

    webpackGlobal.push([[Symbol("requireGetter__" + ADDON_NAME)],
        {},
        (internalRequire) => {
            appRequire = internalRequire;
        }
    ]);
    webpackGlobal.pop();

    if (!appRequire) {
        console.error("Failed to get appRequire func");
        return;
    }

    // получение DI модуля (оно хранит все синглтоны необходимые для работы аддона)
    const diModule = appRequire(58900);
    if (!diModule || !diModule.Dt) {
        console.error("Failed to find DI module. Wait for addon update!");
        return;
    }

    let hooked = false;
    const di = diModule.Dt;
    const originalDiGet = di.prototype.get;

    di.prototype.get = function(_) {
        const result = originalDiGet.apply(this, arguments);

        if (!hooked) {
            const gfir = this.shared.get("GetFileInfoResource");
            
            if (gfir) {
                hooked = true;
                
                di.prototype.get = originalDiGet; 
                
                hookMethods(gfir);
            }
        }
        
        return result;
    };

    // основной код аддона, выполняется после инициализации DI
    function hookMethods(gfir) {
        // подмена треков
        const originalGetFileInfo = gfir.getLocalFileDownloadInfo;
        gfir.getLocalFileDownloadInfo = async function(trackId) {
            const replacedTrack = getReplaced(trackId);
            if (replacedTrack?.url) {
                log("Replacing track " + trackId + " with url " + replacedTrack.url);
                return {
                    trackId: trackId,
                    urls: [replacedTrack.url]
                };
            }
            return originalGetFileInfo.apply(this, arguments);
        };

        const originalIsDownloaded = gfir.isTrackDownloaded;
        gfir.isTrackDownloaded = async function(trackId, _) {
            if (getReplaced(trackId)) {
                return true;
            }
            return originalIsDownloaded.apply(this, arguments);
        };
    }

    // === хранение подменных треков ===
    /* из базы данных */
    let localTracks = {};

    // открытие базы данных
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(ADDON_NAME + "Data", 3);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains("tracks")) {
                    db.createObjectStore("tracks", { keyPath: "id" });
                }

                if (!db.objectStoreNames.contains("remote_exceptions")) {
                    db.createObjectStore("remote_exceptions", { keyPath: "id" });
                }

                if (!db.objectStoreNames.contains("reported_tracks")) {
                    db.createObjectStore("reported_tracks", { keyPath: "id" });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // первоначальная загрузка треков из базы данных
    openDB().then(db => {
        const tx = db.transaction("tracks", 'readonly');
        const store = tx.objectStore("tracks");
        const request = store.getAll();

        request.onsuccess = () => {
            request.result.forEach(({ id, data }) => {
                localTracks[id] = URL.createObjectURL(data);
            });
            log("Tracks from local database:", localTracks);
        };
    });

    /* из папки assets */
    let assetsTracks = {};
    function updateAssetsTracks() {
        fetch("http://localhost:2007/assets?name=" + ADDON_NAME)
            .then(response => response.json())
            .then(data => {
                Object.keys(data.files).forEach(file => {
                    id = file.split(".")[0]
                    url = "http://localhost:2007/assets/" + file + "?name=" + ADDON_NAME + "&"
                    assetsTracks[id] = url;
                });
                log("Tracks from assets:", assetsTracks);
            });
    }

    updateAssetsTracks();

    /* из репозитория */
    let remoteTracks = {};
    let remoteExceptions = [];

    fetch("https://raw.githubusercontent.com/Hazzz895/FckCensorData/refs/heads/main/list.json")
        .then(response => response.json())
        .then(data => {
            remoteTracks = data.tracks;
            log("Tracks from remote repository:", remoteTracks);
            openDB().then(db => {
                const tx = db.transaction("remote_exceptions", 'readonly');
                const store = tx.objectStore("remote_exceptions");
                const request = store.getAll();

                request.onsuccess = () => {
                    remoteExceptions = request.result.map(item => item.id);
                };
            });
        });

    // получение ссылки на трек
    function getReplaced(trackId) {
        if (!trackId) return null;
        url = null;
        src = null;
        if  (localTracks[trackId]) {
            url = localTracks[trackId];
            src = "local";
        }
        else if (assetsTracks[trackId]) {
            url = assetsTracks[trackId];
            src = "assets";
        }
        else if (remoteExceptions.includes(trackId)) {
            url = null;
            src = "remote_exception";
        }
        else if (remoteTracks[trackId]) {
            url = remoteTracks[trackId];
            src = "remote";
        }
        return url || src ? { url, src } : null;
    }

    const api = {
        API_URL: "https://pzomqvgckpgkshxhpite.supabase.co/rest/v1/",
        KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6b21xdmdja3Bna3NoeGhwaXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTgzNDEsImV4cCI6MjA5MDYzNDM0MX0.ggCxM-ver3gDWUBWyhSBfy3n7rpdW8jtlxRQVCXkhNg",
        report(trackId, replaced) {
            if (!trackId) return;
            trackId = Number(trackId);
            if (isNaN(trackId) || this.reportedTracks.includes(trackId)) return;

            const targetTable = "reported_tracks";
            const body = {
                track_id: trackId,
                replaced
            }

            fetch(`${this.API_URL}${targetTable}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": this.KEY,
                    "Authorization": `Bearer ${this.KEY}`,
                },
                body: JSON.stringify(body)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to report track. Status: ${response.status}`);
                }
                this.reportedTracks.push(trackId);
                openDB().then(db => {
                    const tx = db.transaction(targetTable, 'readwrite');
                    const store = tx.objectStore(targetTable);
                    store.add({ id: trackId });
                });
                log("Reported track " + trackId);
            })
            .catch(err => {
                console.error(`[${ADDON_NAME}] Failed to report track`, err);
            });
        },
        reportedTracks: [],
        loadReportedTracks() {
            openDB().then(db => {
                const tx = db.transaction("reported_tracks", 'readonly');
                const store = tx.objectStore("reported_tracks");
                const request = store.getAll();

                request.onsuccess = () => {
                    this.reportedTracks = request.result.map(item => item.id);
                };
            });
        }
    }

    api.loadReportedTracks();

    /* === контекстное меню подмены (сохранение в indexeddb) === */
    function onContextMenuClick(entity, item) {
        entity = window.pulsesyncApi?.getCurrentTrack() ?? entity;
        const trackId = entity.id;
        const replaced = getReplaced(trackId);

        function reloadPlayer() { 
            const e = window.sonataState?.queueState?.currentEntity?.value?.entity;
            const mediaPlayer = window.sonataState?.currentMediaPlayer?.value?.currentMediaPlayer;
            if (e && mediaPlayer) {
                mediaPlayer.reload(e);
                log("Player reloaded");
            }
        }

        // если трек НЕ подменен, то открывается пикер файлов и затем он сохраняется в бд
        if (!replaced) {
            window.showOpenFilePicker({
                types:
                [
                    {
                        description: 'Аудио-файлы',
                        accept: { 'audio/*': ['.mp3', '.wav', '.ogg', '.flac'] }
                    }
                ],
                multiple: false 
            })
            .then(async (fileHandles) => {
                const fileHandle = fileHandles[0];

                const file = await fileHandle.getFile();
                if (!file.type.startsWith("audio/")) {
                    alert("Выбранный файл не является аудио-файлом.");
                    return;
                }
                const db = await openDB();

                localTracks[trackId] = URL.createObjectURL(file);

                const tx = db.transaction("tracks", 'readwrite');
                const store = tx.objectStore("tracks");
                
                store.add({ id: trackId, data: file });
                api.report(trackId, true);
                reloadPlayer();
                updateReplaceItem(entity, item);
                log("Added track " + trackId + " to local tracks");
            });
        }
        // если трек есть в базе данных, то удаление
        else if (replaced.src == "local") {
            delete localTracks[trackId];
            reloadPlayer();
            openDB().then(db => {
                const tx = db.transaction("tracks", 'readwrite');
                const store = tx.objectStore("tracks");
                store.delete(trackId);
            });
            updateReplaceItem(entity, item);
            log("Removed track " + trackId + " from local tracks");
        }
        // если трек подменен из репозитория, то добавление в исключения
        else if (replaced.src == "remote") {
            remoteExceptions.push(trackId);
            reloadPlayer();
            openDB().then(db => {
                const tx = db.transaction("remote_exceptions", 'readwrite');
                const store = tx.objectStore("remote_exceptions");
                store.add({ id: trackId });
            });
            updateReplaceItem(entity, item);
            log("Added track " + trackId + " to remote exceptions");
        }
        // если трек в исключениях, то удаление оттуда
        else if (replaced.src == "remote_exception") {
            remoteExceptions = remoteExceptions.filter(id => id != trackId);
            reloadPlayer();
            openDB().then(db => {
                const tx = db.transaction("remote_exceptions", 'readwrite');
                const store = tx.objectStore("remote_exceptions");
                store.delete(trackId);
            });
            updateReplaceItem(entity, item);
            log("Removed track " + trackId + " from remote exceptions");
        }
        else {
            return;
        }
    }

    function updateReplaceItem(entity, item) {
        const span = item.querySelector('span')
        const replaced = !!(getReplaced(entity?.id)?.url);

        span.childNodes[0].firstElementChild.setAttribute("xlink:href", "/icons/sprite.svg#" + (replaced ? "close" : "edit") + "_xxs");
        span.childNodes[1].nodeValue = replaced ? "Удалить замену" : "Подменить трек";
    }

    // следим за dom-изменениями
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (!(node instanceof HTMLElement)) return;
                // появилось ли контекстное меню трека?
                const trackMenu = node?.querySelector("[data-test-id='TRACK_CONTEXT_MENU']:not(:has([data-test-id='CONTEXT_MENU_REPLACE_BUTTON']))");
                if (trackMenu) {
                    const button = trackMenu.ariaLabelledByElements[0];
                    // а относится ли контекстное меню к плееру?
                    if (button.matches("[data-test-id='PLAYERBAR_DESKTOP_CONTEXT_MENU_BUTTON'], [data-test-id='FULLSCREEN_PLAYER_CONTEXT_MENU_BUTTON']")) {
                        const entity = window.pulsesyncApi?.getCurrentTrack();
                        const replaced = getReplaced(entity?.id);
                        if (!entity || replaced?.src == "assets") return;

                        // создаем кнопку подмены
                        const downloadItem = trackMenu.querySelector('[data-test-id="CONTEXT_MENU_DOWNLOAD_BUTTON"]')
                        if (!downloadItem) return;

                        const replaceItem = downloadItem.cloneNode(true)
                        replaceItem.setAttribute('data-test-id', 'CONTEXT_MENU_REPLACE_BUTTON');

                        updateReplaceItem(entity, replaceItem);
                        replaceItem.addEventListener('click', () => onContextMenuClick(entity, replaceItem));

                        downloadItem.parentElement.insertBefore(replaceItem, downloadItem.nextSibling);
                    }
                }
            })
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();