(node:1) Warning: Supplying "ephemeral" for interaction response options is deprecated. Utilize flags instead.

(Use `node --trace-warnings ...` to show where the warning was created)

/app/utils/twitchChecker.js:28

  data.data.forEach(stream => {

            ^

 

TypeError: Cannot read properties of undefined (reading 'forEach')

    at checkTwitchLive (/app/utils/twitchChecker.js:28:13)

    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)

 

Node.js v18.20.5