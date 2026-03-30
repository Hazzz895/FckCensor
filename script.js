(function() {
    // получение метода require из webpack
    const webpackGlobal = window.webpackChunk_N_E;
    let appRequire = null;

    webpackGlobal.push([[Symbol("requireGetter__FckCensor")],
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

    // пытаемся хукнуть получение этого самого DI
    let diMap = null;
    di.prototype.get = function(_) {
        const result = originalDiGet.apply(this, arguments);

        if (!hooked) {
            diMap = this.shared;
            const slam = diMap.get("Slam");
            const gfir = diMap.get("GetFileInfoResource");
            
            if (slam && gfir) {
                hooked = true;
                
                di.prototype.get = originalDiGet; 
                
                main(slam, gfir);
            }
        }
        
        return result;
    };

    // хранение подменных треков
    // из базы данных
    let localTracks = {};

    // открытие базы данных
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("FckCensorData", 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains("tracks")) {
                    db.createObjectStore("tracks", { keyPath: "id" });
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
            console.debug("Tracks from local database:", localTracks);
        };
    });

    // из папки assets
    let assetsTracks = {};
    function updateAssetsTracks() {
        fetch("http://localhost:2007/assets?name=FckCensor")
            .then(response => response.json())
            .then(data => {
                Object.keys(data.files).forEach(file => {
                    id = file.split(".")[0]
                    url = "http://localhost:2007/assets/" + file + "?name=FckCensor&"
                    assetsTracks[id] = url;
                });
                console.debug("Tracks from assets:", assetsTracks);
            });
    }

    updateAssetsTracks();

    // из репозитория
    let remoteTracks = {};

    fetch("https://raw.githubusercontent.com/Hazzz895/FckCensorData/refs/heads/main/list.json")
        .then(response => response.json())
        .then(data => {
            remoteTracks = data.tracks;
            console.debug("Tracks from remote repository:", remoteTracks);
        });

    // основной код аддона, выполняется после инициализации DI
    function main(slam, gfir) {
        // подмена треков
        const originalGetFileInfo = gfir.getLocalFileDownloadInfo;
        gfir.getLocalFileDownloadInfo = async function(trackId) {
            const replacedTrack = getReplaced(trackId);
            if (replacedTrack) {
                console.debug("Replacing track " + trackId + " with url " + replacedTrack.url);
                return {
                    trackId: trackId,
                    urls: [replacedTrack.url]
                };
            }
            return originalGetFileInfo.apply(this, arguments);
        };

        const originalIsDownloaded = gfir.isTrackDownloaded;
        gfir.isTrackDownloaded = async function(trackId, quality) {
            if (getReplaced(trackId)) {
                return true;
            }
            return originalIsDownloaded.apply(this, arguments);
        };
    }

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
        else if (remoteTracks[trackId]) {
            url = remoteTracks[trackId];
            src = "remote";
        }
        return url ? { url, src } : null;
    }

    // контекстное меню подмены (сохранение в indexeddb)
    function onContextMenuClick(entity, item) {
        entity = window.pulsesyncApi?.getCurrentTrack() ?? entity;
        const trackId = entity.id;
        const replaced = getReplaced(trackId);
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
                console.log("Selected file handles:", fileHandles);
                const fileHandle = fileHandles[0];

                const file = await fileHandle.getFile();
                if (!file.type.startsWith("audio/")) {
                    alert("Выбранный файл не является аудио-файлом.");
                    return;
                }
                console.log("Selected file:", file);
                const db = await openDB();

                localTracks[trackId] = URL.createObjectURL(file);

                const tx = db.transaction("tracks", 'readwrite');
                const store = tx.objectStore("tracks");
                
                store.add({ id: trackId, data: file });
                updateReplaceItem(entity, item);
                console.debug("Added track " + trackId + " to local tracks");
            });
        }
        // если трек есть в базе данных, то удаление
        else if (replaced.src == "local") {
            delete localTracks[trackId];
            openDB().then(db => {
                const tx = db.transaction("tracks", 'readwrite');
                const store = tx.objectStore("tracks");
                store.delete(trackId);
            });
            updateReplaceItem(entity, item);
            console.debug("Removed track " + trackId + " from local tracks");
        }
    }

    function updateReplaceItem(entity, item) {
        const span = item.querySelector('span')
        const replaced = !!getReplaced(entity?.id);

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
                        if (!entity || replaced?.src != "local") return;

                        const downloadItem = trackMenu.querySelector('[data-test-id="CONTEXT_MENU_DOWNLOAD_BUTTON"]')
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