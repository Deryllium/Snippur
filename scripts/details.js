const electron = require('electron');
const shell = electron.shell;
const remote = electron.remote;
const Menu = remote.Menu;

let item;

const inputMenu = Menu.buildFromTemplate([
    {
        label: 'Open in browser',
        click: function() {
            shell.openExternal(item);
        }
    },
    {
        label: 'Copy',
        role: 'copy'
    },
    {
        type: 'separator'
    },
    {
        label: 'Select all',
        role: 'selectall'
    }
]);

$(document).ready(function() {
    ipcRenderer.on('imgur-details', (event, arg) => {
        $("#thumbnail").attr("src", arg.link);

        $("#link-input").val('http://imgur.com/' + arg.id);
        $('#direct-input').val(arg.link);
        $('#markdown-input').val('[Imgur](' + arg.link + ')');
    });

    document.body.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();

        let node = e.target;

        item = node.value;

        while (node) {
            if (node.nodeName.match(/^(input|textarea)$/i || node.isContentEditable)) {
                inputMenu.popup(remote.getCurrentWindow());
                break;
            }
            node = node.parentNode;
        }
    });
});