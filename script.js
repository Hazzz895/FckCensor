(function() {
    "use strict"
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
    function findModule(...requiredStrings) {
        for (const id in appRequire.m) {
            try {
                const mod = appRequire(id);
                const moduleStr = Object.keys(mod);
                if (requiredStrings.every(str => moduleStr.includes(str))) {
                    return mod;
                }
            } catch(e) {
                log(`Ошибка при поиске модуля ${id}`, e);
            }
        }
        return null;
    }

    const diModule = findModule("Dt", "P9", "Gr", "do");
    if (!diModule?.Dt) {
        console.error("Failed to find DI module. Wait for addon update!");
        return;
    }

    
    const di = diModule.Dt;
    const originalDiGet = di.prototype.get;

    // хук получения DI
    let hooked = false;
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
        const originalGetFileInfo = gfir.getLocalFileDownloadInfo;
        gfir.getLocalFileDownloadInfo = async function(trackId) {
            const replacedTrack = getReplaced(trackId);
            
            if (replacedTrack && replacedTrack.src !== "remote_exception") {
                let url = replacedTrack.url;
                
                if (replacedTrack.src === "local" && !replacedTrack.url) {
                    url = await getLocalTrackUrl(trackId);
                }

                if (url) {
                    log("Replacing track " + trackId + " with url " + url);
                    return {
                        trackId: trackId,
                        urls: [url]
                    };
                }
            }
            return originalGetFileInfo.apply(this, arguments);
        };

        const originalIsDownloaded = gfir.isTrackDownloaded;
        gfir.isTrackDownloaded = async function(trackId, _) {
            const replacedTrack = getReplaced(trackId);
            if (replacedTrack && replacedTrack.src !== "remote_exception") {
                return true;
            }
            return originalIsDownloaded.apply(this, arguments);
        };
    }

    // === хранение подменных треков ===
    /* из базы данных */
    let localTracksUrlCache = {};
    let localTrackIds = [];

    async function getLocalTrackUrl(trackId) {
        if (localTracksUrlCache[trackId]) return localTracksUrlCache[trackId];

        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("tracks", 'readonly');
            const store = tx.objectStore("tracks");
            const request = store.get(trackId); 

            request.onsuccess = () => {
                if (request.result && request.result.data) {
                    const url = URL.createObjectURL(request.result.data);
                    localTracksUrlCache[trackId] = url;
                    resolve(url);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    // открытие базы данных
    let dbPromise = null;
    function openDB() {
        if (!dbPromise) {
            dbPromise = new Promise((resolve, reject) => {
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
        return dbPromise;
    }

    // первоначальная загрузка треков из базы данных
    openDB().then(db => {
        const tx = db.transaction("tracks", 'readonly');
        const store = tx.objectStore("tracks");
        const request = store.getAllKeys(); 

        request.onsuccess = () => {
            localTrackIds = request.result;
            log("Loaded ", Object.keys(localTrackIds).length, "local tracks");
        };
    });

    /* из папки assets */
    let assetsTracks = {};
    function updateAssetsTracks() {
        fetch("http://localhost:2007/assets?name=" + ADDON_NAME)
            .then(response => response.json())
            .then(data => {
                Object.keys(data.files).forEach(file => {
                    const id = file.split(".")[0]
                    const url = "http://localhost:2007/assets/" + file + "?name=" + ADDON_NAME + "&"
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
        })
        .catch(err => {
            console.error(`[${ADDON_NAME}] Ошибка при попытке получить список треков с удалённого репозитория: `, err)
        });

    // получение ссылки на трек
    function getReplaced(trackId) {
        if (!trackId) return null;
        trackId = String(trackId);
        let url = null;
        let src = null;
        if  (localTrackIds.includes(trackId)) {
            url = localTracksUrlCache[trackId];
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

    function isReplaced(trackId) {
        const replacedData = getReplaced(trackId);
        return !!(replacedData && replacedData.src !== "remote_exception");
    }

    // апи для отправки заблюренных треков
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
                    store.put({ id: trackId });
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
        },
        isReported(trackId) {
            if (!trackId) return;
            trackId = Number(trackId);
            return !isNaN(trackId) && this.reportedTracks.includes(trackId);
        }
    }

    api.loadReportedTracks();

    /* === контекстное меню подмены (сохранение в indexeddb) === */
    function onContextMenuReplaceClick(trackId, item) {
        const replaced = getReplaced(trackId);

        function reloadPlayer() { 
            const e = window.sonataState?.queueState?.currentEntity?.value?.entity;
            const mediaPlayer = window.sonataState?.currentMediaPlayer?.value?.currentMediaPlayer;
            if (e && mediaPlayer && e.entityData?.meta?.id == trackId) {
                mediaPlayer.reload(e);
                log("Player reloaded");
            }
        }

        function onSuccess() {
            reloadPlayer();
            updateReplaceItem(trackId, item);
            addReplacedMarks();
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

                localTrackIds.push(trackId)
                localTracksUrlCache[trackId] = URL.createObjectURL(file);

                const tx = db.transaction("tracks", 'readwrite');
                const store = tx.objectStore("tracks");
                
                store.put({ id: trackId, data: file });
                api.report(trackId, true);
                onSuccess();
                log("Added track " + trackId + " to local tracks");
            })
            .catch(err => {
                if (err.name !== 'AbortError') {
                    alert("Ошибка во время выбора файла, посмотрите консоль для подробной информации.")
                    console.error(`[${ADDON_NAME}] Ошибка при выборе файла:`, err);
                }
            });
        }
        // если трек есть в базе данных, то удаление
        else if (replaced.src == "local") {
            localTrackIds = localTrackIds.filter(id => id != trackId);
            
            if (localTracksUrlCache[trackId]) {
                URL.revokeObjectURL(localTracksUrlCache[trackId]);
                delete localTracksUrlCache[trackId];
            }
            
            openDB().then(db => {
                const tx = db.transaction("tracks", 'readwrite');
                const store = tx.objectStore("tracks");
                store.delete(trackId);
                onSuccess();
                log("Removed track " + trackId + " from local tracks");
            });
        }
        // если трек подменен из репозитория, то добавление в исключения
        else if (replaced.src == "remote") {
            remoteExceptions.push(trackId);
            openDB().then(db => {
                const tx = db.transaction("remote_exceptions", 'readwrite');
                const store = tx.objectStore("remote_exceptions");
                store.add({ id: trackId });
                onSuccess();
                log("Added track " + trackId + " to remote exceptions");
            });
        }
        // если трек в исключениях, то удаление оттуда
        else if (replaced.src == "remote_exception") {
            remoteExceptions = remoteExceptions.filter(id => id != trackId);
            openDB().then(db => {
                const tx = db.transaction("remote_exceptions", 'readwrite');
                const store = tx.objectStore("remote_exceptions");
                store.delete(trackId);
                onSuccess();
                log("Removed track " + trackId + " from remote exceptions");
            });
        }
        else {
            return;
        }
    }

    function updateReplaceItem(trackId, item) {
        const span = item.querySelector('span')
        const replaced = isReplaced(trackId);

        span.childNodes[0].firstElementChild.setAttribute("xlink:href", "/icons/sprite.svg#" + (replaced ? "close" : "edit") + "_xxs");
        span.childNodes[1].nodeValue = replaced ? "Удалить замену" : "Подменить трек";

        const ymTrackDownloadItem = item.parentElement?.querySelector('[data-test-id="CONTEXT_MENU_DOWNLOAD_BUTTON"]');
        if (ymTrackDownloadItem) {
            ymTrackDownloadItem.style.display = replaced ? "none" : "";
        }

        updateReportItem(trackId, item.parentElement?.querySelector('[data-test-id="CONTEXT_MENU_REPORT_BUTTON"]'))
    }

    function updateReportItem(trackId, item, forcedValue = undefined) {
        if (!item || !trackId) return;
        item.style.display = (forcedValue !== undefined && forcedValue !== null ? forcedValue : (api.isReported(trackId) || getReplaced(trackId))) ? "none" : "";
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
                    if (button) {
                        function createItems(trackId) {
                            const replaced = getReplaced(trackId);
                            if (trackId && replaced?.src != "assets") {
                                const downloadItem = trackMenu.querySelector('[data-test-id="CONTEXT_MENU_DOWNLOAD_BUTTON"]')
                                if (downloadItem) {
                                    // создаем кнопку подмены
                                    const replaceItem = downloadItem.cloneNode(true)
                                    replaceItem.setAttribute('data-test-id', 'CONTEXT_MENU_REPLACE_BUTTON');
                                    replaceItem.addEventListener('click', () => onContextMenuReplaceClick(trackId, replaceItem));

                                    downloadItem.parentElement.insertBefore(replaceItem, downloadItem.nextSibling);
                                    updateReplaceItem(trackId, replaceItem);

                                    // создаем кнопку репорта блюра
                                    const reportItem = downloadItem.cloneNode(true)
                                    reportItem.setAttribute('data-test-id', 'CONTEXT_MENU_REPORT_BUTTON');

                                    const span = reportItem.querySelector("span");
                                    span.childNodes[0].firstElementChild.setAttribute("xlink:href", "/icons/sprite.svg#" + "attention_xxxl");
                                    span.childNodes[1].nodeValue = "Сообщить о цензуре";

                                    reportItem.addEventListener('click', () => {
                                        api.report(trackId, false);
                                        updateReportItem(trackId, reportItem, true)
                                        alert("[FckCensor]\nТрек скоро будет добавлен в список автоматически заменяемых треков. Спасибо, что помогаете сделать аддон лучше!")
                                    });

                                    downloadItem.parentElement.insertBefore(reportItem, replaceItem.nextSibling);
                                    updateReportItem(trackId, reportItem)
                                }
                            }
                        }
                        // а относится ли контекстное меню к плееру?
                        if (button.matches("[data-test-id='PLAYERBAR_DESKTOP_CONTEXT_MENU_BUTTON'], [data-test-id='FULLSCREEN_PLAYER_CONTEXT_MENU_BUTTON']")) {
                            const entity = window.pulsesyncApi?.getCurrentTrack();
                            createItems(entity?.id)
                        }
                        else {
                            const source = button.closest('[data-intersection-property-id*="track_"]');
                            if (source) {
                                const intersection = source.getAttribute("data-intersection-property-id");
                                const trackId = intersection.match(/track_(\d+)/);
                                if (trackId) {
                                    createItems(trackId[1])
                                }
                            }
                        }
                    }
                }
            })
            
            addReplacedMarks(mutation.target);
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    function createMark(node) {
        const metaCtr = node.querySelector(".Meta_titleContainer__gDuXr:not(:has(.Meta_replacedMarkContainer))")
        if (!metaCtr) return;
        const span = document.createElement("span");
        span.classList.add("Meta_replacedMarkContainer")
        span.innerHTML = 
        `<svg 
            class="ExplicitMarkIcon_explicitMark__0BPeQ Meta_explicitMark__ocnCV Rkdd2vKC_3xa1eUdRdHP" 
            focusable="false" 
            aria-label="Трек подменен аддоном ${ADDON_NAME}" 
            data-test-id="REPLACED_MARK_ICON">
                <use xlink:href="/icons/sprite.svg#edit_xxs">
                </use>
        </svg>`

        const trackOptionsButton = metaCtr.querySelector(`div:has([data-test-id="PLAYERBAR_DESKTOP_CONTEXT_MENU_BUTTON"])`);
        if (trackOptionsButton) {
            metaCtr.insertBefore(span, trackOptionsButton);
        }
        else {
            metaCtr.appendChild(span)
        }
        span.addEventListener("mouseenter", (ev) => {
            const ctr = document.createElement("div");
            ctr.id = "FckCensorTooltip"
            const bounding = ev.target.getBoundingClientRect();
            ctr.innerHTML = 
            `<div 
                class="QhR4J536RmNHBB5bZYwF TooltipWithTitle_root__7jLY3" 
                data-test-id="TOOLTIP_WITH_TITLE" 
                tabindex="-1"
                role="tooltip" 
                style="position: absolute; left: 0px; top: 0px; visibility: visible; transform: translate(${bounding.left}px, ${bounding.top + bounding.height}px);">
                <div 
                    class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR Fqg1VWCJUfasVVxqICeO">
                    <div 
                        class="TooltipWithTitle_text__ElBtq">
                        <span 
                            class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 ZYV27jeWd30QDXu4GhaH TooltipWithTitle_description__HsGcR"
                            >${ev.target.firstElementChild.ariaLabel}</span>
                    </div>
                </div>
                </div>`
            document.body.appendChild(ctr);
        });
        span.addEventListener("mouseleave", (_) => {
            document.getElementById("FckCensorTooltip")?.remove();
        })
    }

    function addReplacedMarks(node = document.body) {
        const trackContainers = node.querySelectorAll('.CommonTrack_root__i6shE[data-intersection-property-id*="track_"]')
        trackContainers.forEach(ctr => {
            const intersection = ctr.getAttribute("data-intersection-property-id");
            const trackId = intersection?.match(/track_(\d+)/);
            if (trackId) {
                const replaced = isReplaced(trackId[1]);
                if (replaced) {
                    createMark(ctr);
                }
                else {
                    ctr.querySelector(".Meta_replacedMarkContainer")?.remove()
                }
            }
        })
        updatePlayerbarReplacedMark(node);
    }

    function updatePlayerbarReplacedMark(node = document.body) {
        try {
            const playerContainers = node.querySelectorAll(':is([data-test-id="PLAYERBAR_DESKTOP"], [data-test-id="FULLSCREEN_PLAYER_FULLSCREEN_CONTENT"])');
            if (playerContainers.length == 0) return;
            const entity = pulsesyncApi.getCurrentTrack();
            const replaced = isReplaced(entity?.id);
            playerContainers.forEach(ctr => {
                if (replaced) {
                    createMark(ctr);
                }
                else {
                    ctr.querySelectorAll(".Meta_replacedMarkContainer").forEach(rpctr => {
                        rpctr.remove();
                    })
                }
            })
        }
        catch (e) {
            console.error(e)
        }
    }

    window.pulsesyncApi._waitForPlayer(player => {
        updatePlayerbarReplacedMark()
        player.state?.queueState?.currentEntity?.onChange(() => updatePlayerbarReplacedMark())
    })

    addReplacedMarks();
})();