const {ipcRenderer} = require('electron');

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

$(document).ready(function() {
    ipcRenderer.send('display-snap');
    ipcRenderer.on('reply-snap', (event, arg) => {
        $("#snapshot").attr("src", arg);
    });
    var ias = $('#snapshot').imgAreaSelect({
        x1: 0, y1: 0, x2: 0, y2: 0,
        onSelectStart: function() {
            $('#snapshot').removeClass('overlay');
        },
        onSelectEnd: function (img, selection) {
            $('input[name="x1"]').val(selection.x1);
            $('input[name="y1"]').val(selection.y1);
            $('input[name="x2"]').val(selection.x2);
            $('input[name="y2"]').val(selection.y2);

            var canvas = document.createElement("canvas"),
                context = canvas.getContext("2d");

            canvas.width = selection.width;
            canvas.height = selection.height;

            context.drawImage(img, selection.x1, selection.y1, selection.width, selection.height, 0, 0, selection.width, selection.height);

            ipcRenderer.send('resize-small', selection);
            ipcRenderer.send('snapped', canvas.toDataURL());
            window.location = "window.html";
        }
    });
    
    ias.update();
});