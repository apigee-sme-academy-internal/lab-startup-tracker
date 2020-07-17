## Lab Task Tracker

This tool is useful for monitoring lab bootstrap tasks.

#### How to use it
The student simply runs the following command:

```
lab-bootstrap monitor
```

It will show the status and elapsed time for the lab bootstrap tasks.

#### How create a task

The following example creates a new task with ID `mytask` and display name `My Task`.

```shell script
lab-bootstrap begin mytask "My Task"
```

#### How stop a task

```shell script
lab-bootstrap end mytask
```


#### How update task state

```shell script
lab-bootstrap update mytask "new-state"
```

#### How to delete a task

```shell script
lab-bootstrap del mytask
```

#### How to list all task IDs

```shell script
lab-bootstrap list
```






