$(function() {

var parseParams = function(str) {
    return str.split('&').reduce(function (params, param) {
        if (!param) {
            return params;
        }
        var paramSplit = param.split('=').map(function (value) {
            return decodeURIComponent(value.replace('+', ' '));
        });
        params[paramSplit[0]] = paramSplit[1];
        return params;
    }, {});
};

var params = parseParams(window.location.search.slice(1));
var root = window;
var token = params.token || '';

if (!token) {
    try {
        var cnc = {};
        cnc = JSON.parse(localStorage.getItem('cnc') || {});
        cnc.state = cnc.state || {};
        cnc.state.session = cnc.state.session || {};
        token = cnc.state.session.token || '';
    } catch (err) {
        // Ignore error
    }
}

// WebSocket
var socket = root.io.connect('', {
    query: 'token=' + token
});

socket.on('connect', function() {
    $('#loading').remove(); // Remove loading message
    root.cnc.router.init();
    window.location = '#/';
    $('[data-route="connection"] [data-name="btn-open"]').trigger('click');
    root.cnc.getFileList();
});

socket.on('error', function() {
    socket.destroy();
    window.location = '/'; // Redirect to webroot
});

socket.on('close', function() {
});

// constants
var GRBL = 'Grbl';
var SMOOTHIE = 'Smoothie';
var TINYG = 'TinyG';

// Workflow State
var WORKFLOW_STATE_RUNNING = 'running';
var WORKFLOW_STATE_PAUSED = 'paused';
var WORKFLOW_STATE_IDLE = 'idle';

var CNCController = function() {
    this.socket = socket;

    this.callbacks = {
        //
        // System Events
        //
        'startup': [],
        'config:change': [],
        'task:start': [],
        'task:finish': [],
        'task:error': [],
        'serialport:list': [],
        'serialport:change': [],
        'serialport:open': [],
        'serialport:close': [],
        'serialport:error': [],
        'serialport:read': [],
        'serialport:write': [],
        'gcode:load': [],
        'gcode:unload': [],
        'feeder:status': [],
        'sender:status': [],
        'workflow:state': [],
        'Grbl:state': [],
        'Grbl:settings': [],
        'Smoothie:state': [],
        'Smoothie:settings': [],
        'TinyG:state': [],
        'TinyG:settings': []
    };

    this.port = '';
    this.baudrate = 115200;
    this.type = '';
    this.state = {};
    this.settings = {};
    this.workflowState = WORKFLOW_STATE_IDLE;

    Object.keys(this.callbacks).forEach(function(eventName) {
        socket.on(eventName, function() {
            var args = Array.prototype.slice.call(arguments);

            if (eventName === 'serialport:open') {
                this.port = args[0].port;
                this.type = args[0].controllerType;
            }
            if (eventName === 'serialport:close') {
                this.port = '';
                this.type = '';
                this.state = {};
                this.settings = {};
                this.workflowState = WORKFLOW_STATE_IDLE;
            }
            if (eventName === 'workflow:state') {
                this.workflowState = args[0];
            }
            if (eventName === 'Grbl:state') {
                this.type = GRBL;
                this.state = args[0];
            }
            if (eventName === 'Grbl:settings') {
                this.type = GRBL;
                this.settings = args[0];
            }
            if (eventName === 'Smoothie:state') {
                this.type = SMOOTHIE;
                this.state = args[0];
            }
            if (eventName === 'Smoothie:settings') {
                this.type = SMOOTHIE;
                this.settings = args[0];
            }
            if (eventName === 'TinyG:state') {
                this.type = TINYG;
                this.state = args[0];
            }
            if (eventName === 'TinyG:settings') {
                this.type = TINYG;
                this.settings = args[0];
            }

            this.callbacks[eventName].forEach(function(callback) {
                callback.apply(callback, args);
            });
        }.bind(this));
    }.bind(this));
};

CNCController.prototype.on = function(eventName, callback) {
    var callbacks = this.callbacks[eventName];
    if (!callbacks) {
        console.error('Undefined event name:', eventName);
        return;
    }
    if (typeof callback === 'function') {
        callbacks.push(callback);
    }
};

CNCController.prototype.off = function(eventName, callback) {
    var callbacks = this.callbacks[eventName];
    if (!callbacks) {
        console.error('Undefined event name:', eventName);
        return;
    }
    if (typeof callback === 'function') {
        callbacks.splice(callbacks.indexOf(callback), 1);
    }
};

CNCController.prototype.openPort = function(port, options) {
    socket.emit('open', port, options);

    this.type = options.controllerType;
    this.port = port;
    this.baudrate = options.baudrate;
};

CNCController.prototype.closePort = function(port) {
    port = port || this.port;

    socket.emit('close', port);

    this.type = '';
    this.port = '';
    this.baudrate = 0;
};

CNCController.prototype.listAllPorts = function() {
    socket.emit('list');
};

// @param {string} cmd The command string
// @example Example Usage
// - Load G-code
//   controller.command('gcode:load', name, gcode, callback)
// - Unload G-code
//   controller.command('gcode:unload')
// - Start sending G-code
//   controller.command('gcode:start')
// - Stop sending G-code
//   controller.command('gcode:stop')
// - Pause
//   controller.command('gcode:pause')
// - Resume
//   controller.command('gcode:resume')
// - Feed Hold
//   controller.command('feedhold')
// - Cycle Start
//   controller.command('cyclestart')
// - Status Report
//   controller.command('statusreport')
// - Homing
//   controller.command('homing')
// - Sleep
//   controller.command('sleep')
// - Unlock
//   controller.command('unlock')
// - Reset
//   controller.command('reset')
// - Feed Override
//   controller.command('feedOverride')
// - Spindle Override
//   controller.command('spindleOverride')
// - Rapid Override
//   controller.command('rapidOverride')
// - G-code
//   controller.command('gcode', 'G0X0Y0')
// - Load a macro
//   controller.command('macro:load', '<macro-id>', { /* optional vars */ }, callback)
// - Run a macro
//   controller.command('macro:run', '<macro-id>', { /* optional vars */ }, callback)
// - Load file from a watch directory
//   controller.command('watchdir:load', '/path/to/file', callback)
CNCController.prototype.command = function(cmd) {
    var args = Array.prototype.slice.call(arguments, 1);
    socket.emit.apply(socket, ['command', this.port, cmd].concat(args));
};

// @param {string} data The data to write.
// @param {object} [context] The associated context information.
CNCController.prototype.write = function(data, context) {
    socket.emit('write', this.port, data, context);
};

// @param {string} data The data to write.
// @param {object} [context] The associated context information.
CNCController.prototype.writeln = function(data, context) {
    socket.emit('writeln', this.port, data, context);
};

root.cnc.controller = new CNCController();

});
