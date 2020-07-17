const fs_constants = require('fs').constants;
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const TASKS_DIR = path.join(os.tmpdir(), 'lab-tasks');

async function exists(path) {
    let exists = false
    try {
        await fs.access(path, fs_constants.F_OK);
        return true;
    } catch(ex) {
        if (ex.code === 'ENOENT') {
            return false;
        }
        throw ex;
    }
}
async function init() {
    let path = TASKS_DIR ;
    if (!await exists(path)) {
        await fs.mkdir(path);
    }
}

async function begin(id, name) {
    if (!id) throw new Error('task id required');

    await init();
    let task_file = path.join(TASKS_DIR,id);
    let fh = await fs.open(task_file, 'w');
    try {
        await fh.write(`${name || id}|${~~(Date.now() / 1000)}\n`);
    } finally {
        await fh.close(fh);
    }

    await update(id, 'started');
}

async function update(id, state) {
    if (!id) throw new Error('task id required');
    if (!state) throw new Error('task state required');

    await init();
    let task_file = path.join(TASKS_DIR, id);
    let fh = await fs.open(task_file, 'a+');
    try {
        await fh.write(`${state}|${~~(Date.now() / 1000)}\n`);
    } finally {
        await fh.close(fh);
    }
}

async function end(id) {
    if (!id) throw new Error('task id required');

    await init();
    let task_file = path.join(TASKS_DIR,id);
    let fh = await fs.open(task_file, 'a+');
    try {
        await fh.write(`-completed|${~~(Date.now() / 1000)}\n`);
    } finally {
        await fh.close(fh);
    }
}

async function del(id) {
    if (!id) throw new Error('task id required');

    await init();
    let task_file = path.join(TASKS_DIR,id);
    try {
        await fs.unlink(task_file);
    } catch(ex) {
        if (ex.code === 'ENOENT') {
            return true;
        }
        throw ex;
    }
}

async function list(id) {
    await init();
    const dir = await fs.opendir(TASKS_DIR);
    for await (const dirent of dir) {
        console.log(dirent.name);
    }
}


module.exports.begin = begin;
module.exports.update = update;
module.exports.end = end;
module.exports.del = del;
module.exports.list = list;