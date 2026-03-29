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

    // получение списка заблюренных треков
    let customTracks = {};

    fetch("https://raw.githubusercontent.com/Hazzz895/FckCensorData/refs/heads/main/list.json")
        .then(response => response.json())
        .then(data => {
            customTracks = data.tracks;
            console.debug(customTracks)
        });

    // основной код аддона, выполняется после инициализации DI
    function main(slam, gfir) {
        // подмена треков
        const originalGetFileInfo = gfir.getLocalFileDownloadInfo;
        gfir.getLocalFileDownloadInfo = async function(trackId) {
            if (customTracks[String(trackId)]) {
                return {
                    trackId: trackId,
                    urls: [customTracks[String(trackId)]]
                };
            }
            return originalGetFileInfo.apply(this, arguments);
        };

        const originalIsDownloaded = gfir.isTrackDownloaded;
        gfir.isTrackDownloaded = async function(trackId, quality) {
            if (customTracks[String(trackId)]) {
                return true;
            }
            return originalIsDownloaded.apply(this, arguments);
        };
    }
})();