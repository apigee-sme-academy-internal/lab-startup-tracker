#!/usr/bin/env node

const _progress = require('cli-progress');
const { format:formatDate, addSeconds } = require('date-fns');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const TASKS_DIR = path.join(os.tmpdir(), 'lab-tasks');



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

async function get_task_info(task_id) {

    try {
        let file_path = path.join(TASKS_DIR,task_id);
        try {
            await fs.access(file_path);
        } catch (ex) {
            return {
                name: task_id,
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
            display: mkname(task_id),
            state: mkstate('error'),
            time: mktime(""),
            message: mkmsg(ex.message)
        };
    }
}

async function main() {
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
        let files = await fs.readdir(TASKS_DIR)
        for (let file of files) {
            let task_id = file;
            if (tasks[task_id]) continue;

            tasks[task_id] = {};
            let bar = multibar.create(100, 0, );
            tasks[task_id].bar = bar;
        }

        for(let task_id in tasks) {
            let task = tasks[task_id];
            let bar = task.bar;
            let task_info = await get_task_info(task_id);
            bar.update(0,{
                display: task_info.display,
                state: task_info.state,
                time: task_info.time,
                start: task_info.start,
                end: task_info.end,
                message: task_info.message
            });
        }
        await sleep(3);
    }

}

module.exports = main;