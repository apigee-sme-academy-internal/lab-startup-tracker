#!/usr/bin/env node

const _progress = require('cli-progress');
const { format:formatDate, addSeconds } = require('date-fns');
const fs = require('fs').promises;
const path = require('path');
const {init} = require('./utils');

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

// create new container
const multibar = new _progress.MultiBar({
    format: ' {display} {time} {state} {message}',
    forceRedraw: true,
    hideCursor: true,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    clearOnComplete: false,
    stopOnComplete: true,
    synchronousUpdate: true
});


function exitHandler(options, exitCode) {
    multibar.stop();
    if (options.exit) process.exit(exitCode);
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));


function mktime(start, end) {
    if (!start) return "[00:00]";
    if (start && end) {
        let seconds = parseInt(end) - parseInt(start);
        var helperDate = addSeconds(new Date(0), seconds);
        return `[${formatDate(helperDate, 'mm:ss')}]`;
    }

    end =  new String(Date.now() / 1000);
    let seconds = parseInt(end) - parseInt(start);
    var helperDate = addSeconds(new Date(0), seconds);
    return `[${formatDate(helperDate, 'mm:ss')}]`;
}

function mkmsg(msg) {
    if (!msg) return "";
    return `${msg}`;
}

function mkname(name) {
    return `${name} `.padEnd(50, '.');
}

function mkstate(state) {
    return `${state} `.padEnd(15, ' ');
}

function parseLine(txt) {
    if (!txt) return [];

    let parts = txt.split("|");
    return [
        (parts[0] || "").replace(/^\s+|\s+$/g, ''),
        (parts[1] || "").replace(/^\s+|\s+$/g, ''),
    ];
}

async function get_task_info(task_id, strict = false) {

    const TASKS_DIR = await init();

    try {
        let file_path = path.join(TASKS_DIR,task_id);
        try {
            await fs.access(file_path);
        } catch (ex) {
            if (strict) return null;
            return {
                name: task_id,
                start: "0",
                display: mkname(task_id),
                state: mkstate('unknown'),
                time: mktime(""),
                message: mkmsg("")
            };
        }
        let text = (await fs.readFile(file_path)).toString();
        text = text.replace(/^\s+|\s+$/g, '');
        let lines = text.split("\n");

        let [task_first_state, task_first_time] = parseLine(lines[0]);
        let [task_last_state, task_last_time] = parseLine(lines[lines.length-1]);

        if (task_last_state.startsWith("-")) {
            task_last_state = task_last_state.substring(1);
        } else {
            task_last_time = null;
        }

        let task_info = {
            start: task_first_time,
            end: task_last_time,
            name: task_first_state,
            display: mkname(task_first_state || task_id),
            state: mkstate(task_last_state),
            time: mktime(task_first_time, task_last_time),
            message: mkmsg("")
        };

        return task_info;
    } catch (ex) {
        return {
            name: task_id,
            start: "0",
            display: mkname(task_id),
            state: mkstate('error'),
            time: mktime(""),
            message: mkmsg(ex.message)
        };
    }
}

async function monitor(task_list) {
    const TASKS_DIR = await init();

    async function get_task_ids(){
        if (!task_list) return await fs.readdir(TASKS_DIR);
        return task_list.split(",");
    }

    let empty = multibar.create(100, 0, );
    empty.update(0,{
        name: " ",
        display: " ",
        state: " ",
        time: " ",
        message: ""
    });

    let title = multibar.create(100, 0, );
    title.update(0,{
        name: "tasks",
        display: mkname("Task"),
        state: mkstate('State'),
        time: "Time   ",
        message: ""
    });

    let tasks = {};

    while(true) {
        let files = await get_task_ids();
        for (let file of files) {
            let task_id = file;
            if (tasks[task_id]) continue;

            tasks[task_id] = {};
            tasks[task_id].id = task_id;
            tasks[task_id].info = await get_task_info(task_id);
        }

        let task_array = Object.values(tasks);
        task_array.sort(function(a,b) {
            return parseInt(a.info.start) - parseInt(b.info.start);
        })

        for(let task of task_array) {
            task.info = await get_task_info(task.id, !task_list);
            if (!task.info && task.bar) {
                multibar.remove(task.bar);
                continue;
            }

            if (!task.bar) {
                task.bar = multibar.create(100, 0, );
            }

            let bar = task.bar;
            bar.update(0,{
                display: task.info.display,
                state: task.info.state,
                time: task.info.time,
                start: task.info.start,
                end: task.info.end,
                message: task.info.message
            });
        }
        await sleep(3);
    }

}


module.exports = monitor;