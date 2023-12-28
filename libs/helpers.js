
const helpers = { dumpJSON };
export default helpers

import fs from 'fs'

/*
    dump object to file
*/
export function dumpJSON(dict, name) {
    fs.writeFile(`logs/${name}.json`, JSON.stringify(dict, null, 2), (error) => {
        if (error) {
            throw error;
        }
    });
}