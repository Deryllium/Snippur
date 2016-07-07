const {ipcRenderer} = require('electron');

$(document).ready(function() {
    ipcRenderer.send('loaded');
    ipcRenderer.on('loaded-reply', (event, arg) => {
        captureScreen(arg);
    });
});

function captureScreen(size) {
    navigator.webkitGetUserMedia({
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                minWidth: size.width,
                maxWidth: 4000,
                minHeight: size.height,
                maxHeight: 4000
            }
        }
    }, gotStream, getUserMediaError);

    function gotStream(stream) {
        var video = document.createElement('video');
        video.addEventListener('loadedmetadata',function(){
            var canvas = document.createElement('canvas');
            canvas.width = this.videoWidth;
            canvas.height = this.videoHeight;
            var context = canvas.getContext("2d");
            context.drawImage(this, 0, 0);

            ipcRenderer.send('snapped', canvas.toDataURL());
            window.location = "screen.html";
        },false);
        video.src = URL.createObjectURL(stream);
        video.play();
    }

    function getUserMediaError(e) {
        console.log('getUserMediaError: ' + JSON.stringify(e, null, '---'));
    }
}