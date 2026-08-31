import { loadRemoteList } from "./remote-api";
import { getDb, loadLocalDb } from "./db-api";
import SourceCollection from "./dto/sources/source-collection";

export const sources = new SourceCollection();

let loaded = false
export async function loadApis() {
    if (loaded) return Promise.resolve();
    
    await Promise.all([loadRemoteList(), loadLocalDb()])
        .then(() => {
            loaded = true;
        });
}