const {ipcRenderer} = require('electron');

var uploading = false;

$(document).ready(function() {
    ipcRenderer.send('display-snap');
    ipcRenderer.on('reply-snap', (event, arg) => {
        $("#snapshot").attr("src", arg);
    });

    document.addEventListener('dragover',function(event){
        event.preventDefault();
        return false;
    },false);

    document.addEventListener('drop',function(event){
        event.preventDefault();
        return false;
    },false);
});

function progress(e){
    if(e.lengthComputable){
        var max = e.total;
        var current = e.loaded;

        var percentage = (current * 100)/max;
        
        $('#progress.overlay').css('width', percentage + '%').css('width', '-=2px');
    }
}

function resetStyles() {
    uploading = false;

    $('.btn.upload').removeAttr('style');
    animateOverlay('#progress.overlay');
}

function animateOverlay(overlay) {
    $(overlay).css('transition', '.5s').css('opacity', '0').on("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd",
        function(e){
            $(overlay).css('width', '0');
            $(this).off(e);
        }
    );
}