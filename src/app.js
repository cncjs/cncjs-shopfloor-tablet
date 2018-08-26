$(function() {

var root = window;
var cnc = root.cnc || {};
var controller = cnc.controller;
var oldFilename = '';
var jogging = false;
var running = false;
var userStopped = false;
var oldState = null;
var probing = false;

cnc.initState = function() {
    // Select the "Load GCode File" heading instead of any file
    cnc.showGCode('', '');
    oldFilename = '';
    jogging = false;
    running = false;
    userStopped = false;
    oldState = null;
    probing = false;
}

controller.on('serialport:list', function(list) {
    var $el = $('[data-route="connection"] select[data-name="port"]');

    $el.empty();
    $.each(list, function(key, value) {
	if (value.manufacturer == 'Synthetos') {
            var $option = $('<option></option>')
		.attr('value', value.port)
		.attr('data-inuse', value.inuse)
		.text(value.port);
            $el.append($option);
	}
    });

    if (cnc.controllerType) {
        $('[data-route="connection"] select[data-name="controllerType"]').val(cnc.controllerType);
    }
    if (cnc.port) {
        $('[data-route="connection"] select[data-name="port"]').val(cnc.port);
    }
    if (cnc.baudrate) {
        $('[data-route="connection"] select[data-name="baudrate"]').val(cnc.baudrate);
    }

});

controller.on('serialport:open', function(options) {
    cnc.initState();

    var controllerType = options.controllerType;
    var port = options.port;
    var baudrate = options.baudrate;

    cnc.connected = true;
    cnc.controllerType = controllerType;
    cnc.port = port;
    cnc.baudrate = baudrate;

    $('[data-route="workspace"] [data-name="port"]').val(port);

    Cookies.set('cnc.controllerType', controllerType);
    Cookies.set('cnc.port', port);
    Cookies.set('cnc.baudrate', baudrate);

    if (controllerType === 'Grbl') {
        // Read the settings so we can determine the units for position reports
        // This will trigger a Grbl:settings callback to set grblReportingUnits

        // This has a problem: The first status report arrives before the
        // settings report, so interpreting the numbers from the first status
        // report is ambiguous.  Subsequent status reports are interpreted correctly.
        // We work around that by deferring status reports until the settings report.
        controller.writeln('$$');
    }

    root.location = '#/axes';
});

controller.on('serialport:close', function(options) {
    var port = options.port;

    cnc.connected = false;
    cnc.controllerType = '';
    cnc.port = '';
    cnc.baudrate = 0;

    $('[data-route="workspace"] [data-name="port"]').val('');
    $('[data-route="axes"] [data-name="active-state"]').text('NoConnect');

    root.location = '#/connection';
});

controller.on('serialport:error', function(options) {
    var port = options.port;

    console.log('Error opening serial port \'' + port + '\'');

    $('[data-route="connection"] [data-name="msg"]').html('<p style="color: red">Error opening serial port \'' + port + '\'</p>');

});

cnc.loadFile = function() {
    filename = document.getElementById('filename').value;
    controller.command('watchdir:load', filename);
}

cnc.goAxis = function(axis, coordinate) {
    jogging = true;
    controller.command('gcode', 'G0 ' + axis + coordinate);
}

cnc.moveAxis = function(axis, field) {
    coordinate = document.getElementById(field).value;
    cnc.goAxis(axis, coordinate)
}

cnc.setAxis = function(axis, field) {
    coordinate = document.getElementById(field).value;
    jogging = true;
    controller.command('gcode', 'G10 L20 P1 ' + axis + coordinate);
}
cnc.MDI = function(field) {
    mdicmd = document.getElementById(field).value;
    controller.command('gcode', mdicmd);
}

cnc.zeroAxis = function(axis) {
    controller.command('gcode', 'G10 L20 P1 ' + axis + '0');
}

cnc.toggleUnits = function() {
    if (document.getElementById('units').innerText == 'mm') {
	controller.command('gcode', 'G20');
    } else {
	controller.command('gcode', 'G21');
    }	
    // No need to fix the button label, as that will be done by the status watcher
}

cnc.setDistance = function(distance) {
    $('[data-route="axes"] select[data-name="select-distance"]').val(distance);
}

cnc.sendMove = function(cmd) {
    jogging = true;
    var jog = function(params) {
        params = params || {};
        var s = _.map(params, function(value, letter) {
            return '' + letter + value;
        }).join(' ');
        controller.command('gcode', 'G91 G0 ' + s); // relative distance
        controller.command('gcode', 'G90'); // absolute distance
    };
    var move = function(params) {
        params = params || {};
        var s = _.map(params, function(value, letter) {
            return '' + letter + value;
        }).join(' ');
        controller.command('gcode', 'G0 ' + s);
    };
    var distance = Number($('[data-route="axes"] select[data-name="select-distance"]').val()) || 0;

    var fn = {
        'G28': function() {
            controller.command('gcode', 'G28');
        },
        'G30': function() {
            controller.command('gcode', 'G30');
        },
        'X0Y0Z0': function() {
            move({ X: 0, Y: 0, Z: 0 })
        },
        'X0': function() {
            move({ X: 0 });
        },
        'Y0': function() {
            move({ Y: 0 });
        },
        'Z0': function() {
            move({ Z: 0 });
        },
        'X-Y+': function() {
            jog({ X: -distance, Y: distance });
        },
        'X+Y+': function() {
            jog({ X: distance, Y: distance });
        },
        'X-Y-': function() {
            jog({ X: -distance, Y: -distance });
        },
        'X+Y-': function() {
            jog({ X: distance, Y: -distance });
        },
        'X-': function() {
            jog({ X: -distance });
        },
        'X+': function() {
            jog({ X: distance });
        },
        'Y-': function() {
            jog({ Y: -distance });
        },
        'Y+': function() {
            jog({ Y: distance });
        },
        'Z-': function() {
            jog({ Z: -distance });
        },
        'Z+': function() {
            jog({ Z: distance });
        }
    }[cmd];

    fn && fn();
};

controller.on('serialport:read', function(data) {
//    var style = 'font-weight: bold; line-height: 20px; padding: 2px 4px; border: 1px solid; color: #222; background: #F5F5F5';
//    console.log('%cR%c', style, '', data);
    if (data.r) {
	cnc.line++;
    }
});

// GRBL reports position in units according to the $13 setting,
// independent of the GCode in/mm parser state.
// We track the $13 value by watching for the Grbl:settings event and by
// watching for manual changes via serialport:write.  Upon initial connection,
// we issue a settings request in serialport:open.
var grblReportingUnits;  // initially undefined

controller.on('serialport:write', function(data) {
//    var style = 'font-weight: bold; line-height: 20px; padding: 2px 4px; border: 1px solid; color: #00529B; background: #BDE5F8';
//    console.log('%cW%c', style, '', data);

    // Track manual changes to the Grbl position reporting units setting
    // We are looking for either $13=0 or $13=1
    if (cnc.controllerType === 'Grbl') {
        cmd = data.split('=');
        if (cmd.length === 2 && cmd[0] === "$13") {
            grblReportingUnits = Number(cmd[1]) || 0;
        }
    }
});

controller.on('sender:status', function(status) {
    cnc.senderHold = status.hold;
    if (cnc.senderHold) {
	cnc.senderHoldReason = status.holdReason.data;
    }
});

// This is a copy of the Grbl:state report that came in before the Grbl:settings report
var savedGrblState;

function renderGrblState(data) {
    var status = data.status || {};
    var activeState = status.activeState;
    var mpos = status.mpos;
    var wpos = status.wpos;
    var IDLE = 'Idle', RUN = 'Run', JOG = 'Jog', HOLD = 'Hold';
    var canClick = [IDLE, RUN].indexOf(activeState) >= 0;
    var canStart = [IDLE].indexOf(activeState) >= 0;
    var canPause = [RUN, JOG].indexOf(activeState) >= 0;
    var canResume = [HOLD].indexOf(activeState) >= 0;
    var canStop = [RUN, JOG, HOLD].indexOf(activeState) >= 0;

    var parserstate = data.parserstate || {};

    // Unit conversion factor - depends on both $13 setting and parser units
    var factor = 1.0;
    // Number of postdecimal digits to display; 3 for in, 4 for mm
    var digits = 4;

    switch (parserstate.modal.units) {
    case 'G20':
	$('[data-route="axes"] [id="units"]').text('Inch');
        digits = 4;
        factor = grblReportingUnits === 0 ? 1/25.4 : 1.0 ;
        break;
    case 'G21':
	$('[data-route="axes"] [id="units"]').text('mm');
        digits = 3;
        factor = grblReportingUnits === 0 ? 1.0 : 25.4;
        break;
    }

    mpos.x = (mpos.x * factor).toFixed(digits);
    mpos.y = (mpos.y * factor).toFixed(digits);
    mpos.z = (mpos.z * factor).toFixed(digits);

    wpos.x = (wpos.x * factor).toFixed(digits);
    wpos.y = (wpos.y * factor).toFixed(digits);
    wpos.z = (wpos.z * factor).toFixed(digits);

    cnc.updateState(canClick, canStart, canPause, canResume, canStop, activeState, wpos, mpos);
}

controller.on('Grbl:state', function(data) {
    // If we do not yet know the reporting units from the $13 setting, we copy
    // the data for later processing when we do know.
    if (typeof grblReportingUnits === 'undefined') {
        savedGrblState = JSON.parse(JSON.stringify(data));
    } else {
        renderGrblState(data);
    }
});

controller.on('Grbl:settings', function(data) {
    var settings = data.settings || {};
    if (settings['$13'] !== undefined) {
        grblReportingUnits = Number(settings['$13']) || 0;

        if (typeof savedGrblState !== 'undefined') {
            renderGrblState(savedGrblState);
            // Don't re-render the state if we get later settings reports,
            // as the savedGrblState is probably stale.
            savedGrblState = undefined;
        }
    }
});

controller.on('Smoothie:state', function(data) {
    var status = data.status || {};
    var activeState = status.activeState;
    var mpos = status.mpos;
    var wpos = status.wpos;
    var IDLE = 'Idle', RUN = 'Run', HOLD = 'Hold';
    var canClick = [IDLE].indexOf(activeState) >= 0;
    var canStart = [IDLE].indexOf(activeState) >= 0;
    var canPause = [RUN].indexOf(activeState) >= 0;
    var canResume = [HOLD].indexOf(activeState) >= 0;
    var canStop = [RUN, HOLD].indexOf(activeState) >= 0;

    var parserstate = data.parserstate || {};

    // Number of postdecimal digits to display; 3 for in, 4 for mm
    var digits = 4;

    // Smoothie reports both mpos and wpos in the current units
    switch (parserstate.modal.units) {
    case 'G20':
	$('[data-route="axes"] [id="units"]').text('Inch');
        digits = 4;
        break;
    case 'G21':
	$('[data-route="axes"] [id="units"]').text('mm');
        digits = 3;
        break;
    }

    mpos.x = mpos.x.toFixed(digits);
    mpos.y = mpos.y.toFixed(digits);
    mpos.z = mpos.z.toFixed(digits);

    wpos.x = wpos.x.toFixed(digits);
    wpos.y = wpos.y.toFixed(digits);
    wpos.z = wpos.z.toFixed(digits);

    cnc.updateState(canClick, canStart, canPause, canResume, canStop, activeState, wpos, mpos);
});

controller.on('TinyG:state', function(data) {
    var sr = data.sr || {};
    var machineState = sr.machineState;
    var stateText = {
        0: 'Init',
        1: 'Ready',
        2: 'Alarm',
        3: 'Pgm Stop',
        4: 'Pgm End',
        5: 'Run',
        6: 'Hold',
        7: 'Probe',
        8: 'Cycle',
        9: 'Homing',
        10: 'Jog',
        11: 'Interlock',
    }[machineState] || 'N/A';
    if (machineState == "") {
	return;
    }
    var mpos = sr.mpos;
    var wpos = sr.wpos;
    var READY = 1, STOP = 3, END = 4, RUN = 5, HOLD = 6;
    var canClick = [READY, STOP, END].indexOf(machineState) >= 0;
    var canStart = [READY, STOP, END].indexOf(machineState) >= 0;
    var canPause = [RUN].indexOf(machineState) >= 0;
    var canResume = [HOLD].indexOf(machineState) >= 0;
    var canStop = [RUN, HOLD].indexOf(machineState) >= 0;

    if (machineState == STOP) {

	if (userStopped) {
	    // Manual stop
	    userStopped = false;
	    running = false;
	    stateText = 'UserStop';
	} else {
	    if (running) {
		// M0 etc
		canStart = false;
		canResume = true;
		if (cnc.senderHold) {
		    stateText = cnc.senderHoldReason;
		    if (stateText == "M6") {
			stateText += " T" + sr.tool;
			console.log(sr.tool);
		    }
		}
	    } else if (jogging) {
		// Jogging
		jogging = false;
		canStart = true;
		canResume = false;
	    } else {
		canStart = true;
		canResume = false;
	    }
	}
    }
    if (machineState == END) {
	if (oldState != END) {
	    running = false;
	    if (probing) {
		probing = false;
		if (oldFilename) {
		    controller.command('watchdir:load', oldFilename);
		    oldFilename = null;
		}
	    }
	} else {
	}
    }
    oldState = machineState;

    switch (sr.modal.units) {
    case 'G20':
	$('[data-route="axes"] [id="units"]').text('Inch');
        // TinyG reports machine coordinates in mm regardless of the in/mm mode
        mpos.x = (mpos.x / 25.4).toFixed(4);
        mpos.y = (mpos.y / 25.4).toFixed(4);
        mpos.z = (mpos.z / 25.4).toFixed(4);
        // TinyG reports work coordinates according to the in/mm mode
        wpos.x = Number(wpos.x).toFixed(4);
        wpos.y = Number(wpos.y).toFixed(4);
        wpos.z = Number(wpos.z).toFixed(4);
        break;
    case 'G21':
	$('[data-route="axes"] [id="units"]').text('mm');
        mpos.x = Number(mpos.x).toFixed(3);
        mpos.y = Number(mpos.y).toFixed(3);
        mpos.z = Number(mpos.z).toFixed(3);
        wpos.x = Number(wpos.x).toFixed(3);
        wpos.y = Number(wpos.y).toFixed(3);
        wpos.z = Number(wpos.z).toFixed(3);
    }
    cnc.updateState(canClick, canStart, canPause, canResume, canStop, stateText, wpos, mpos);
});

cnc.updateState = function(canClick, canStart, canPause, canResume, canStop, stateText, wpos, mpos) {
    if (cnc.filename == '') {
	canStart = false;
    }

    $('[data-route="axes"] .control-pad .btn').prop('disabled', !canClick);
    $('[data-route="axes"] .control-pad .form-control').prop('disabled', !canClick);
    $('[data-route="axes"] .mdi .btn').prop('disabled', !canClick);
    $('[data-route="axes"] .axis-position .btn').prop('disabled', !canClick);
    $('[data-route="axes"] .axis-position .position').prop('disabled', !canClick);

    $('[data-route="axes"] .nav-panel .btn-start').prop('disabled', !canStart);
    $('[data-route="axes"] .nav-panel .btn-start').prop('style').backgroundColor = canStart ? '#86f686' : '#f6f6f6';
    $('[data-route="axes"] .nav-panel .btn-pause').prop('disabled', !canPause);
    $('[data-route="axes"] .nav-panel .btn-pause').prop('style').backgroundColor = canPause ? '#f68686' : '#f6f6f6';
    $('[data-route="axes"] .nav-panel .btn-resume').prop('disabled', !canResume);
    $('[data-route="axes"] .nav-panel .btn-resume').prop('style').backgroundColor = canResume ? '#86f686' : '#f6f6f6';

    $('[data-route="axes"] .nav-panel .btn-stop').prop('disabled', !canStop);
    $('[data-route="axes"] .nav-panel .btn-stop').prop('style').backgroundColor = canStop ? '#f64646' : '#f6f6f6';

    $('[data-route="axes"] [data-name="active-state"]').text(stateText);
    $('[data-route="axes"] [id="wpos-x"]').prop('value', wpos.x);
    $('[data-route="axes"] [id="wpos-y"]').prop('value', wpos.y);
    $('[data-route="axes"] [id="wpos-z"]').prop('value', wpos.z);
    if (document.getElementById('units').innerText == 'mm') {
	root.displayer.reDrawTool(wpos.x, wpos.y);
    } else {
	root.displayer.reDrawTool(wpos.x * 25.4, wpos.y * 25.4);
    }
}

controller.on('gcode:load', function(name, gcode) {
    cnc.showGCode(name, gcode);
    if (probing) {
	cnc.runGCode();
    }
});

controller.on('workflow:state', function(state) {
    if (state == 'idle') {
	cnc.line = 0;
    }
});

controller.listAllPorts();

// Workspace 
$('[data-route="workspace"] [data-name="port"]').val('');
$('[data-route="workspace"] [data-name="btn-close"]').on('click', function() {
    controller.closePort();
});

cnc.reConnect = function() {
    if (cnc.controllerType && cnc.port && cnc.baudrate) {
	controller.openPort(cnc.port, {
            controllerType: cnc.controllerType,
            baudrate: Number(cnc.baudrate)
	});
	return true;
    }
    return false;
};

cnc.runUserCommand = function(name) {
    jQuery.get("../api/commands", {token: cnc.token, paging: false}, function(data) {
	var cmd = data.records.find(function(record) {
	    return record.enabled && record.title == name;
	});
	if (cmd) {
	    //jQuery.post("../api/commands/run/" + cmd.id, {token: cnc.token});
	    jQuery.post("../api/commands/run/" + cmd.id + "?token=" + cnc.token);
	}
    });
}


cnc.getFileList = function() {
    jQuery.get("../api/watch/files", {token: cnc.token}, function(data) {
        var selector = $('[data-route="axes"] select[data-name="select-file"]');
        selector.empty();
        selector.append($("<option disabled />").text('Load GCode File'));
        $.each(data.files, function(index, file) {
	    if (!file.name.endsWith("~")) {
		selector.append($("<option/>").text(file.name));
	    }
	});
        $('[data-route="axes"] select[data-name="select-file"]').val(cnc.filename || 'Load GCode File');
    }, "json");
}

cnc.showGCode = function(name, gcode) {
    var gcodeLoaded = gcode != '';
    if (!gcodeLoaded) {
	gcode = "(No GCode loaded)";
    }
    $('[data-route="axes"] .nav-panel .btn-start').prop('disabled', !gcodeLoaded);
    $('[data-route="axes"] .nav-panel .btn-start').prop('style').backgroundColor = gcodeLoaded ? '#86f686' : '#f6f6f6';

    cnc.filename = name;
    if (name != "") {
	// gcode = "(" + name + ")<br />" + gcode;
	$('[data-route="axes"] select[data-name="select-file"]').val(name);
    } else {
	$('[data-route="axes"] select[data-name="select-file"]')[0][0].selected = true;
    }
    $('[data-route="axes"] [id="gcode"]').text(gcode);
    root.displayer.showToolpath(gcode);
}

cnc.getGCode = function() {
    jQuery.get("../api/gcode", {port: cnc.port}, function(res) {
        var gcode = res.data;
        cnc.showGCode("", gcode);
    });
}

cnc.loadGCode = function() {
    var filename = $('[data-route="axes"] select[data-name="select-file"] option:selected')[0].text;
    controller.command('watchdir:load', filename);
}

$('[data-route="axes"] select[data-name="select-file"]').change(cnc.loadGCode);

cnc.runGCode = function() {
    running = true;
    cnc.controller.command('gcode:start')
}

cnc.stopGCode = function() {
    userStopped = true;
    cnc.controller.command('gcode:stop', { force: true })
}

cnc.probe = function() {
    oldFilename = cnc.filename;
    probing = true;
    controller.command('watchdir:load', "Probe.nc");
}

//
// Connection
//
$('[data-route="connection"] [data-name="btn-open"]').on('click', function() {
    var controllerType = $('[data-route="connection"] [data-name="controllerType"]').val();
    var port = $('[data-route="connection"] [data-name="port"]').val();
    var baudrate = $('[data-route="connection"] [data-name="baudrate"]').val();

    $('[data-route="connection"] [data-name="msg"]').html('Trying');
    if (port) {
	controller.openPort(port, {
            controllerType: controllerType,
            baudrate: Number(baudrate)
	});
    }
}
);

//
// Axes
//
$('[data-route="axes"] [data-name="btn-dropdown"]').dropdown();
$('[data-route="axes"] [data-name="active-state"]').text('NoConnect');
$('[data-route="axes"] select[data-name="select-distance"]').val('1');

});
