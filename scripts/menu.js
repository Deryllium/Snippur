$('#btn_close').click(function() {
    ipcRenderer.send('close');
});

$('#btn_new').click(function() {
    ipcRenderer.send('request-reset');
    ipcRenderer.on('reset-approved', (event) => {
        window.setTimeout(() => ipcRenderer.send('reset'), 1);
    });
});

$('#btn_save').click(function() {
    ipcRenderer.send('save-image');
});

$('#btn_copy').click(function() {
    ipcRenderer.send('copy-image');
    ipcRenderer.on('image-copied', (event) => {
        $('#flash.overlay')
            .css('transition', '0s')
            .css('opacity', '1')
            .css('width', '100%').css('width', '-=2px').css('width', '-=2px');
        animateOverlay('#flash.overlay');
    });
});

$('#btn_upload').click(function() {
    if (uploading) {
        return;
    }

    uploading = true;

    $('.btn.upload').css('opacity', '0.2');
    $('#progress.overlay').css('opacity', '0.5').css('background-color', '#13b48f');

    var img = $('#snapshot').attr('src').split(',')[1];

    $.ajax({
        url: 'https://api.imgur.com/3/upload.json',
        type: 'POST',
        xhr: function() {
            var xhr = $.ajaxSettings.xhr();
            if(xhr.upload){
                xhr.upload.addEventListener('progress', progress, false);
            }
            return xhr;
        },
        headers: {
            Authorization: 'Client-ID ef2fe09f0d5368b'
        },
        data: {
            type: 'base64',
            image: img
        },
        dataType: 'json'
    }).success(function(data) {
        ipcRenderer.send('imgur-response', data.data);
    }).error(function() {
        alert('There was a problem uploading the image. Imgur might be down.');
    }).always(function() {
        resetStyles();
    });
});

$('#btn_info').click(function() {
    ipcRenderer.send('show-about');
});

$('#btn_options').click(function() {
    ipcRenderer.send('show-options');
});