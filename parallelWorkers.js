"use strict";

function initWorkers(workerFn, fnsToInclude, constantsToInclude, workerParams) {
    fnsToInclude = [workerFn, ...(fnsToInclude ?? [])];
    constantsToInclude = constantsToInclude ?? {};
    workerParams = workerParams ?? workerFn.params;
    const workers = [];
    console.log(`${navigator.hardwareConcurrency} workers available`);
    let workerScript = `"use strict";\n`;
    workerScript = Object.entries(constantsToInclude).map(([key, value]) => `const ${key} = ${typeof value === "function" ? value.toString() : JSON.stringify(value)};\n`).join("");
    workerScript += fnsToInclude.map(fn => fn.toString()).join('\n') + '\n';
    workerScript += `onmessage = (e) => {
        const {${workerParams}} = e.data[0];
        const result = ${workerFn.name}(${workerParams});
        postMessage([result]);}`;
    const blob = new Blob([workerScript], { type: 'text/javascript' });
    for (let i = 0; i < navigator.hardwareConcurrency; i++) {
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

function initPixelWorkers(pixelFn, fnsToInclude, constantsToInclude) {
    fnsToInclude = [pixelFn, ...(fnsToInclude ?? [])];
    if(pixelFn.name !== "pixelFn") {
        constantsToInclude = constantsToInclude ?? {};
        constantsToInclude.pixelFn = pixelFn;
    }
    const workerParams = pixelWorkerFn.params.replace("...childParams", pixelFn.params.split(",").slice(3).join(","));
    return initWorkers(pixelWorkerFn, fnsToInclude, constantsToInclude, workerParams);
}

Object.defineProperty(Function.prototype, "params", {
    get() {
        return this.toString().match(/\(([^\)]+)\)/)[1];
    }
});

function pixelWorkerFn(start, end, width, ...childParams) {
    const colorData = [];
    for(let y = start; y < end; y++) {
        const colorRow = [];
        for(let x = 0; x < width; x++) {
            colorRow.push(pixelFn(y, x, width, ...childParams));
        }
        colorData.push(colorRow);
    }
    return colorData;
}

async function runPixelWorkers(workers, width, height, workerParams) {
    const imgData = new ImageData(width, height);
    function applyColorToImage(x, y, color) {
        const i = 4 * (y * width + x);
        imgData.data[i] = color[0];
        imgData.data[i + 1] = color[1];
        imgData.data[i + 2] = color[2];
        imgData.data[i + 3] = 255;
    }
    const chunkSize = Math.ceil(height / workers.length);
    await Promise.all(workers.map((worker, i) => {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, height);
        return worker.runAsync({ start, end, width, ...workerParams })
            .then(colorData => {
                for (let y = 0; y < colorData.length; y++) {
                    for (let x = 0; x < width; x++) {
                        applyColorToImage(x, y + start, colorData[y][x]);
                    }
                }
            });
    }));
    return imgData;
}
