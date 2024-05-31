"use strict";

Object.defineProperty(Function.prototype, "params", {
    get() {
        return this.toString().match(/\(([^\)]+)\)/)[1];
    }
});

console.log(`${navigator.hardwareConcurrency} workers available`);

function initWorkers(workerFn, fnsToInclude, constantsToInclude, workerCount, workerParams) {
    fnsToInclude = [workerFn, ...(fnsToInclude ?? [])];
    constantsToInclude = constantsToInclude ?? {};
    workerCount = workerCount ?? navigator.hardwareConcurrency;
    workerParams = workerParams ?? workerFn.params;
    const workers = [];
    let workerScript = `"use strict";\n`;
    workerScript = Object.entries(constantsToInclude).map(([key, value]) => `const ${key} = ${typeof value === "function" ? value.toString() : JSON.stringify(value)};\n`).join("");
    workerScript += fnsToInclude.map(fn => fn.toString()).join('\n') + '\n';
    workerScript += `onmessage = (e) => {
        const {${workerParams}} = e.data[0];
        const result = ${workerFn.name}(${workerParams});
        postMessage([result]);}`;
    const blob = new Blob([workerScript], { type: 'text/javascript' });
    for (let i = 0; i < workerCount; i++) {
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
    if(pixelFn.name !== "pixelFn") {
        constantsToInclude = constantsToInclude ?? {};
        constantsToInclude.pixelFn = pixelFn;
    }
    else {
        fnsToInclude = [pixelFn, ...(fnsToInclude ?? [])];
    }
    const workerParams = pixelWorkerFn.params.replace("...childParams", pixelFn.params.split(",").slice(3).join(","));
    const workers = initWorkers(pixelWorkerFn, fnsToInclude, constantsToInclude, undefined, workerParams);
    return async (width, height, workerParams) => {
        const imgData = new ImageData(width, height);
        const chunkSize = Math.ceil(height / workers.length);
        await Promise.all(workers.map((worker, i) => {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, height);
            const startTime = new Date();
            return worker.runAsync({ start, end, width, ...workerParams })
                .then(colorData => {
                    const offset = 4 * start * width;
                    imgData.data.set(colorData, offset);
                    const elapsed = (new Date()) - startTime;
                    console.log(`Worker ${i}: ${elapsed / 1000}s`);
                });
        }));
        return imgData;
    }
}

function pixelWorkerFn(start, end, width, ...childParams) {
    const colorData = new Uint8ClampedArray(4 * (end - start) * width);
    for(let y = start; y < end; y++) {
        for(let x = 0; x < width; x++) {
            const color = pixelFn(y, x, width, ...childParams);
            const offset = 4 * ((y - start) * width + x);
            colorData.set(color, offset);
        }
    }
    return colorData;
}

function initPixelWorkersInterlaced(pixelFn, fnsToInclude, constantsToInclude) {
    if(pixelFn.name !== "pixelFn") {
        constantsToInclude = constantsToInclude ?? {};
        constantsToInclude.pixelFn = pixelFn;
    }
    else {
        fnsToInclude = [pixelFn, ...(fnsToInclude ?? [])];
    }
    const workerParams = pixelWorkerFnInterlaced.params.replace("...childParams", pixelFn.params.split(",").slice(3).join(","));
    const workers = initWorkers(pixelWorkerFnInterlaced, fnsToInclude, constantsToInclude, workerParams);
    return async (width, height, workerParams) => {
        const imgData = new ImageData(width, height);
        const chunkSize = Math.ceil(height / workers.length);
        await Promise.all(workers.map((worker, i) => {
            const startTime = new Date();
            return worker.runAsync({ offset: i, numWorkers: workers.length, height, width, ...workerParams })
                .then(colorData => {
                    for(let j = 0; j < colorData.length; j++) {
                        const colorRow = colorData[j];
                        imgData.data.set(colorRow, 4 * (i + j * workers.length) * width);
                    }
                    const elapsed = (new Date()) - startTime;
                    console.log(`Worker ${i}: ${elapsed / 1000}s`);
                });
        }));
        return imgData;
    }
}

function pixelWorkerFnInterlaced(offset, numWorkers, height, width, ...childParams) {
    //const colorData = new Uint8ClampedArray(4 * (Math.floor(height / chunkSize) + (offset < (height % chunkSize) ? 1 : 0)));
    const colorData = [];
    for(let y = offset; y < height; y += numWorkers) {
        const colorRow = new Uint8ClampedArray(4 * width);
        for(let x = 0; x < width; x++) {
            const color = pixelFn(y, x, width, ...childParams);
            colorRow.set(color, 4 * x);
        }
        colorData.push(colorRow);
    }
    return colorData;
}
