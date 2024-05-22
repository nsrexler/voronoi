"use strict";

function initWorkers(workerFn, fnsToInclude, constantsToInclude) {
    fnsToInclude = [workerFn, ...(fnsToInclude ?? [])];
    constantsToInclude = constantsToInclude ?? {};
    const workerParams = workerFn.toString().match(/\(([^\)]+)\)/)[1];
    const workers = [];
    console.log(`${navigator.hardwareConcurrency} workers available`)
    for (let i = 0; i < navigator.hardwareConcurrency; i++) {
        let workerScript = `"use strict";\n`;
        workerScript = Object.entries(constantsToInclude).map(([key, value]) => `const ${key} = ${JSON.stringify(value)};\n`).join("");
        workerScript += fnsToInclude.map(fn => fn.toString()).join('\n') + '\n';
        workerScript += `onmessage = (e) => {
            const {${workerParams}} = e.data[0];
            const result = ${workerFn.name}(${workerParams});
            postMessage([result]);}`;
        const blob = new Blob([workerScript], { type: 'text/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        worker.runAsync = function (data) {
            this.postMessage([data]);
            return new Promise((resolve, reject) => {
                this.onmessage = (e) => {
                    resolve(e.data[0]);
                }
            })
        }
        workers.push(worker);
    }
    return workers;
}
