let options;

$(document).ready(function() {
    ipcRenderer.send('retrieve-options');
    ipcRenderer.on('send-options', (event, arg) => {
        options = arg;
        
        $('#auto-copy').prop('checked', options.autoCopy);
        $('#auto-open').prop('checked', options.autoOpen);
        $('#run-in-background').prop('checked', options.background);
        $('#run-on-startup').prop('checked', options.startup);
    });
});

$('#auto-copy').click(function() {
    options.autoCopy = !options.autoCopy;
    ipcRenderer.send('update-options', options);
});

$('#auto-open').click(function() {
    options.autoOpen = !options.autoOpen;
    ipcRenderer.send('update-options', options);
});

$('#run-in-background').click(function() {
    options.background = !options.background;
    ipcRenderer.send('update-options', options);
});

$('#run-on-startup').click(function() {
    options.startup = !options.startup;
    ipcRenderer.send('update-options', options);
});