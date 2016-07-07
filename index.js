const electron = require('electron');
const {app, ipcMain, clipboard, shell, globalShortcut, dialog, BrowserWindow, Tray, Menu} = electron;

const storage = require('electron-json-storage');
const path = require('path');
const fs = require('fs');

const nativeImage = electron.nativeImage;
const iconPath = path.join(__dirname, 'img', 'icon.ico');

let mainWindow;
let detailsWindow;
let optionsWindow;

let appIcon;

let size;
let maximumSize;
let minimumSize = {
    width: 480,
    height: 320
};

let offset = {
    width: 12,
    height: 12
};

let position;
let center;

let snapshot;
let imageTemp;

let options = {
    autoCopy: true,
    autoOpen: false,
    background: false,
    startup: false
};

app.on('ready', () => {
    size = getApproximateSize();
    maximumSize = getApproximateMaximumSize();
    position = getPosition();
    center = getCenterBounds();

    storage.has('options', function(error, has) {
       if (error) throw error;

        if (has) {
            loadOptions();
        } else {
            saveOptions();
        }
    });

    initializeWindows();
    initializeIpcEvents();
    initializeShortcuts();
    initializeTray();
});

app.on('window-all-closed', () => {
    if (options.background) {
        return;
    }
    if (process.platform != 'darwin')
        app.exit(1);
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

function initializeWindows() {
    snapshot = 'img/icon.png';
    imageTemp = 'img/icon.png';

    mainWindow = new BrowserWindow({
        width: size.width,
        height: size.height,
        x: position.x,
        y: position.y,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        enableLargerThanScreen: true,
        show: false,
        icon: iconPath
    });

    mainWindow.setMenu(null);

    mainWindow.on('close', (event) => {
        if (options.background) {
            event.preventDefault();
            mainWindow.hide();
            detailsWindow.hide();
            optionsWindow.hide();
        } else {
            app.exit(1);
        }
    });

    loadDefaultWindow();

    detailsWindow = new BrowserWindow({
        width: 320,
        height: 400,
        frame: false,
        resizable: false,
        parent: mainWindow,
        show: false,
        icon: iconPath
    });

    detailsWindow.setMenu(null);
    detailsWindow.loadURL('file://' + __dirname + '/details.html');

    optionsWindow = new BrowserWindow({
        width: 320,
        height: 512,
        frame: false,
        resizable: false,
        parent: mainWindow,
        show: false,
        icon: iconPath
    });

    optionsWindow.setMenu(null);
    optionsWindow.loadURL('file://' + __dirname + '/options.html');
}

function initializeIpcEvents() {
    ipcMain.on('loaded', (event) => {
        event.sender.send('loaded-reply', size);
    });

    ipcMain.on('snapped', (event, arg) => {
        snapshot = arg;
        imageTemp = arg;
    });

    ipcMain.on('display-snap', (event) => {
        event.sender.send('reply-snap', snapshot);
        mainWindow.show();
    });

    ipcMain.on('resize-small', (event, arg) => {
        resizeMainWindow(arg);
    });

    ipcMain.on('close', (event) => {
        if (detailsWindow.isFocused()) {
            detailsWindow.hide();
            return;
        }
        if (optionsWindow.isFocused()) {
            optionsWindow.hide();
            return;
        }
        if (mainWindow.isFocused()) {
            if (options.background) {
                mainWindow.hide();
            } else {
                mainWindow.close();
            }
            return;
        }
    });

    ipcMain.on('copy-image', (event) => {
        let image = nativeImage.createFromDataURL(snapshot);
        clipboard.writeImage(image);
        event.sender.send('image-copied');
    });

    ipcMain.on('save-image', (event) => {
        dialog.showSaveDialog(mainWindow, {
            filters: [
                {name: 'Images', extensions: ['jpg', 'png', 'gif']}
            ],
            title: 'Save Image',
            defaultPath: 'image.png'
        }, function(fileName) {
            let data = snapshot.replace(/^data:image\/png;base64,/, "");
            fs.writeFile(fileName, data, 'base64');
        });
    });

    ipcMain.on('request-reset', (event) => {
        hideAllWindows();
        event.sender.send('reset-approved');
    });

    ipcMain.on('imgur-response', (event, arg) => {
        if (options.autoCopy) {
            clipboard.writeText(arg.link);
        }
        if (options.autoOpen) {
            shell.openExternal('http://imgur.com/' + arg.id);
        }
        showWindowCentered(detailsWindow);
        keepWithinBounds(detailsWindow);
        detailsWindow.webContents.send('imgur-details', arg);
    });

    ipcMain.on('reset', (event) => {
        initiateSnap();
    });

    ipcMain.on('show-options', (event) => {
        showWindowCentered(optionsWindow);
        keepWithinBounds(optionsWindow);
    });

    ipcMain.on('retrieve-options', (event) => {
        event.sender.send('send-options', options);
    });

    ipcMain.on('update-options', (event, arg) => {
        options = arg;
        saveOptions();
    })
}

function initializeShortcuts() {
    globalShortcut.register('CommandOrControl+Shift+\\', () => {
        hideAllWindows();
        setTimeout(() => resetMainWindow(), 100);
    });

    registerWindowShortcuts(mainWindow);
    registerWindowShortcuts(optionsWindow);
    registerWindowShortcuts(detailsWindow);
}

function registerWindowShortcuts(window) {
    window.on('focus', () => {
        registerLocalShortcuts();
    });
    window.on('blur', () => {
        unregisterLocalShortcuts();
    });
}

function registerLocalShortcuts() {
    globalShortcut.register('Escape', () => {
        if (mainWindow.isFocused() || optionsWindow.isFocused() || detailsWindow.isFocused()) {
            loadDefaultWindow();
        }
    });
    globalShortcut.register('CommandOrControl+N', () => {
        if (mainWindow.isFocused() || optionsWindow.isFocused() || detailsWindow.isFocused()) {
            hideAllWindows();
            setTimeout(() => resetMainWindow(), 100);
        }
    });
}

function unregisterLocalShortcuts() {
    globalShortcut.unregister('Escape');
    globalShortcut.unregister('CommandOrControl+N');
}

function initializeTray() {
    appIcon = new Tray(iconPath);

    var contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show / Hide Snippur',
            click: function() {
                mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
                if (!mainWindow.isVisible()) {
                    optionsWindow.hide();
                    detailsWindow.hide();
                }
            },
            checked: true
        },
        {
            label: 'New Snip',
            click: function() {
                hideAllWindows();
                setTimeout(() => resetMainWindow(), 100);
            }
        },
        {
            label: 'Options',
            click: function() {
                showWindowCentered(optionsWindow);
            }
        },
        {
            label: 'Exit',
            click: function() {
                app.exit(1);
            }
        }
    ]);

    appIcon.on('click', (event, bounds) => {
        mainWindow.show();
        mainWindow.focus();
        contextMenu.items[0].checked = true;
    });

    appIcon.setContextMenu(contextMenu);
}

function initiateSnap() {
    detailsWindow.hide();
    optionsWindow.hide();
    resetMainWindow();
}

function hideAllWindows() {
    mainWindow.hide();
    optionsWindow.hide();
    detailsWindow.hide();
}

function loadDefaultWindow() {
    resizeMainWindow({
        x1: center.x,
        y1: center.y,
        width: minimumSize.width,
        height: minimumSize.height
    });

    mainWindow.loadURL('file://' + __dirname + '/window.html');
}

function resetMainWindow() {
    mainWindow.setBounds({
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height
    });

    mainWindow.setSize(size.width, size.height);
    mainWindow.loadURL('file://' + __dirname + '/index.html');
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setResizable(false);

    snapshot = null;
}

function resizeMainWindow(arg) {
    setTimeout(() => mainWindow.setMinimumSize(minimumSize.width, minimumSize.height), 1);

    var xOffset = minimumSize.width - arg.width - 24;
    var yOffset = minimumSize.height - (arg.height + 74);

    if (xOffset <= 0) {
        xOffset = 0;
    } else {
        xOffset = Math.round(xOffset / 2);
    }

    if (yOffset <= 0) {
        yOffset = 0;
    } else {
        yOffset = Math.round(yOffset / 2);
    }

    mainWindow.setBounds({
        x: (arg.x1 + position.x) - offset.width - (xOffset),
        y: (arg.y1 + position.y) - offset.height - 48 - (yOffset),
        width: arg.width + offset.width * 2,
        height: (arg.height + offset.height * 2) + 48
    });

    mainWindow.setSize(arg.width + offset.width * 2, (arg.height + offset.height * 2) + 48);

    keepWithinBounds(mainWindow);

    mainWindow.setAlwaysOnTop(false);
    mainWindow.blur();
    mainWindow.focus();
    mainWindow.setResizable(true);
}

function showWindowCentered(window) {
    window.setBounds({
        x: mainWindow.getBounds().x + Math.round(mainWindow.getBounds().width / 2) - Math.round(window.getBounds().width / 2),
        y: mainWindow.getBounds().y + Math.round(mainWindow.getBounds().height / 2) - Math.round(window.getBounds().height / 2),
        width: window.getBounds().width,
        height: window.getBounds().height
    });

    window.show();
}

function getPosition() {
    let position = {x: 0, y: 0};
    let displays = electron.screen.getAllDisplays();

    for (var i in displays) {
        let display = displays[i];

        if (display.bounds.x < position.x) {
            position.x = display.bounds.x;
        }

        if (display.bounds.y < position.y) {
            position.y = display.bounds.y;
        }
    }

    return position;
}

function getCenterBounds() {
    let bounds = {x: 0, y: 0};

    let display = electron.screen.getPrimaryDisplay();

    bounds.x = Math.round((display.bounds.x + display.bounds.width / 2) - (minimumSize.width / 2));
    bounds.y = Math.round((display.bounds.y + display.bounds.height / 2) - (minimumSize.height / 2));

    return bounds;
}

function getApproximateSize() {
    let size = null;

    let displays = electron.screen.getAllDisplays();
    let currentDisplay = null;

    for (var i in displays) {
        let display = displays[i];

        if (size === null) {
            size = display.size;
        }

        if (currentDisplay !== null && currentDisplay !== display) {
            if (display.bounds.x != currentDisplay.bounds.x) {
                size.width += display.size.width;
            }
            if (display.bounds.y != currentDisplay.bounds.y) {
                size.height += display.size.height;
            }
        }

        currentDisplay = display;
    }

    return size;
}

function getApproximateMaximumSize() {
    let display = electron.screen.getPrimaryDisplay();

    let size = display.size;
    size.width -= 256;
    size.height -= 128;

    return size;
}

function keepWithinBounds(window) {
    if (window.getBounds().x < position.x) {
        window.setBounds({
            x: position.x,
            y: window.getBounds().y,
            width: window.getBounds().width,
            height: window.getBounds().height
        });
    }

    if (window.getBounds().x + window.getBounds().width > size.width + position.x) {
        window.setBounds({
            x: size.width + position.x - window.getBounds().width,
            y: window.getBounds().y,
            width: window.getBounds().width,
            height: window.getBounds().height
        });
    }

    if (window.getBounds().y < position.y) {
        window.setBounds({
            x: window.getBounds().x,
            y: position.y,
            width: window.getBounds().width,
            height: window.getBounds().height
        });
    }

    if (window.getBounds().y + window.getBounds().height > size.height + position.y) {
        window.setBounds({
            x: window.getBounds().x,
            y: size.height + position.y - window.getBounds().height,
            width: window.getBounds().width,
            height: window.getBounds().height
        });
    }
}

function loadOptions() {
    storage.get('options', function(error, data) {
        options = data;
    });
}

function saveOptions() {
    storage.set('options', options, function(error) {
        if (error) throw error;
    });
}