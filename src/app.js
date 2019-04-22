$(function() {

const MACHINE_STALL = 0;
const MACHINE_IDLE = 1;
const MACHINE_RUN = 2;
const MACHINE_HOLD = 3;

var root = window;
var cnc = root.cnc || {};
var controller = cnc.controller;
var oldFilename = '';
var running = false;
var userStopRequested = false;
var oldState = null;
var probing = false;
var startTime = 0;
var runTime = 0;
var watchPath = '';
var feedOverride = 1.0;
var rapidOverride = 1.0;
var spindleOverride = 1.0;
var workflowState = '';
var errorMessage;
var receivedLines = 0;
var gCodeLoaded = false;
var machineWorkflow = MACHINE_STALL;
var stateText, wpos, mpos, velocity, spindleDirection, spindleSpeed, wcs, stateName;

cnc.initState = function() {
    // Select the "Load GCode File" heading instead of any file
    cnc.showGCode('', '');
    oldFilename = '';
    running = false;
    userStopRequested = false;
    oldState = null;
    probing = false;
}

controller.on('serialport:list', function(list) {
    var $el = $('[data-route="connection"] select[data-name="port"]');

    $el.empty();
    $.each(list, function(key, value) {
        var portText = value.port;
        if (value.manufacturer) {
            portText += ' (' + value.manufacturer + ')';
        }
        var $option = $('<option></option>')
	    .attr('value', value.port)
	    .attr('data-inuse', value.inuse)
	    .html(portText);
        $el.append($option);
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

    $('[data-route="connection"] [data-name="btn-open"]').prop('disabled',true);
    $('[data-route="connection"] [data-name="btn-close"]').prop('disabled',false);

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

    root.location = '#/workspace';
});

controller.on('serialport:close', function(options) {
    var port = options.port;

    cnc.connected = false;
    cnc.controllerType = '';
    cnc.port = '';
    cnc.baudrate = 0;

    $('[data-route="connection"] [data-name="btn-open"]').prop('disabled',false);
    $('[data-route="connection"] [data-name="btn-close"]').prop('disabled',true);

    $('[data-route="workspace"] [data-name="active-state"]').text('NoConnect');

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
    cnc.click();
    controller.command('gcode', 'G0 ' + axis + coordinate);
}

cnc.moveAxis = function(axis, field) {
    coordinate = document.getElementById(field).value;
    cnc.goAxis(axis, coordinate)
}

cnc.setAxis = function(axis, field) {
    cnc.click();
    coordinate = document.getElementById(field).value;
    controller.command('gcode', 'G10 L20 P1 ' + axis + coordinate);
}
cnc.MDI = function(field) {
    cnc.click();
    mdicmd = document.getElementById(field).value;
    controller.command('gcode', mdicmd);
}

cnc.zeroAxis = function(axis) {
    cnc.click();
    controller.command('gcode', 'G10 L20 P1 ' + axis + '0');
}

cnc.toggleUnits = function() {
    cnc.click();
    if (document.getElementById('units').innerText == 'mm') {
	controller.command('gcode', 'G20');
    } else {
	controller.command('gcode', 'G21');
    }	
    // No need to fix the button label, as that will be done by the status watcher
}

cnc.setDistance = function(distance) {
    cnc.click();
    $('[data-route="workspace"] select[data-name="select-distance"]').val(distance);
}

cnc.click = function() { cnc.clicksound.play() }

cnc.sendMove = function(cmd) {
    cnc.click();
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
    var distance = Number($('[data-route="workspace"] select[data-name="select-distance"]').val()) || 0;

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
    if (status.elapsedTime) {
        elapsedTime = status.elapsedTime;
    }
    if (cnc.controllerType != 'TinyG' && status.received) {
        // TinyG/g2core reports the line count in the state report,
        // reflecting the line that is actually being executed. That
        // is more interesting to the user that how many lines have
        // been sent, so we only use the sender line count if the
        // better one is not available.
        receivedLines = status.received;
    }
    if (cnc.senderHold) {
        if (status.holdReason) {
            if (status.holdReason.err) {
                cnc.senderHoldReason = 'Error';
                errorMessage = status.holdReason.err;
            } else {
	        cnc.senderHoldReason = status.holdReason.data;
            }
        } else {
            cnc.senderHoldReason = "";
        }
    }
});

// This is a copy of the Grbl:state report that came in before the Grbl:settings report
var savedGrblState;

function renderGrblState(data) {
    var status = data.status || {};
    stateName = status.activeState;
    mpos = status.mpos;
    wpos = status.wpos;

    // Grbl states are Idle, Run, Jog, Hold
    // The code used to allow click in Run state but that seems wrong
    // canClick = stateName == 'Idle';

    if (stateName == 'Idle') {
        machineWorkflow = MACHINE_IDLE;
    } else if (stateName == 'Hold') {
        machineWorkflow = MACHINE_HOLD;
    } else {
        machineWorkflow = MACHINE_RUN;
    }

    var parserstate = data.parserstate || {};
    var modal = parserstate.modal || {};

    // Unit conversion factor - depends on both $13 setting and parser units
    var factor = 1.0;
    // Number of postdecimal digits to display; 3 for in, 4 for mm
    var digits = 4;

    switch (modal.units) {
    case 'G20':
	$('[data-route="workspace"] [id="units"]').text('Inch');
        digits = 4;
        factor = grblReportingUnits === 0 ? 1/25.4 : 1.0 ;
        break;
    case 'G21':
	$('[data-route="workspace"] [id="units"]').text('mm');
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

    velocity = parserstate.feedrate;
    spindleSpeed = parserstate.spindle;
    spindleDirection = modal.spindle;
    wcs = modal.wcs;

    feedOverride = status.ov[0]/100.0;
    rapidOverride = status.ov[1]/100.0;
    spindleOverride = status.ov[2]/100.0;

    cnc.updateView();
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

// Smoothie state and GRBL state are identical except for the overrides.
// GRBL has ov: []  while Smootie has ovF and ovS.

controller.on('Smoothie:state', function(data) {
    var status = data.status || {};
    stateName = status.activeState;
    mpos = status.mpos;
    wpos = status.wpos;
    // Smoothie states are Idle, Run, Hold
    // canClick = stateName == 'Idle';
    if (stateName == 'Idle') {
        machineWorkflow = MACHINE_IDLE;
    } else if (stateName == 'Hold') {
        machineWorkflow = MACHINE_HOLD;
    } else {
        machineWorkflow = MACHINE_RUN;
    }

    var parserstate = data.parserstate || {};
    var modal = parserstate.modal || {};

    // Number of postdecimal digits to display; 3 for in, 4 for mm
    var digits = 4;

    // Smoothie reports both mpos and wpos in the current units
    switch (modal.units) {
    case 'G20':
	$('[data-route="workspace"] [id="units"]').text('Inch');
        digits = 4;
        break;
    case 'G21':
	$('[data-route="workspace"] [id="units"]').text('mm');
        digits = 3;
        break;
    }

    mpos.x = mpos.x.toFixed(digits);
    mpos.y = mpos.y.toFixed(digits);
    mpos.z = mpos.z.toFixed(digits);

    wpos.x = wpos.x.toFixed(digits);
    wpos.y = wpos.y.toFixed(digits);
    wpos.z = wpos.z.toFixed(digits);

    velocity = parserstate.feedrate;
    spindleSpeed = parserstate.spindle;
    spindleDirection = modal.spindle;
    wcs = modal.wcs;

    spindleOverride = status.ovF/100.0;
    rapidOverride = 1.0;
    feedOverride = status.ovS/100.0;

    cnc.updateView();
});

controller.on('TinyG:state', function(data) {
    var sr = data.sr || {};
    var machineState = sr.machineState;
    var feedrate = sr.feedrate;
    velocity = sr.velocity || 0;
    spindleSpeed = sr.sps;
    spindleDirection = sr.modal.spindle;
    stateName = {
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
    mpos = sr.mpos;
    wpos = sr.wpos;
    var INIT = 0, READY = 1, ALARM = 2, STOP = 3, END = 4, RUN = 5,
        HOLD = 6, PROBE = 7, CYCLE = 8, HOMING = 9, JOG = 10, INTERLOCK = 11;
    if ([INIT, ALARM, INTERLOCK].indexOf(machineState) >= 0) {
        machineWorkflow = MACHINE_STALL;
    } else if ([READY, STOP, END].indexOf(machineState) >= 0) {
        machineWorkflow = MACHINE_IDLE;
    } else if ([RUN, CYCLE, HOMING, JOG].indexOf(machineState) >= 0) {
        machineWorkflow = MACHINE_RUN;
    } else {
        machineWorkflow = MACHINE_HOLD;
    }

    if (machineState == STOP) {
	if (userStopRequested) {
	    // Manual stop
	    userStopRequested = false;
	    running = false;
	    stateName = 'UserStop';
	} else {
	    if (running) {
		// M0 etc
		machineWorkflow = MACHINE_HOLD;
		if (cnc.senderHold) {
		    stateName = cnc.senderHoldReason;
		    if (stateName == "M6") {
                        if (sr.tool) {
			    stateName += " T" + sr.tool;
                        }
		    }
		}
	    }
	}
    }
    if (machineState == END) {
	if (userStopRequested) {
	    // Manual stop
	    userStopRequested = false;
	    running = false;
	    stateName = 'UserStop';
        } else if (oldState != END) {
	    running = false;
	    if (probing) {
		probing = false;
		if (oldFilename) {
		    controller.command('watchdir:load', oldFilename);
		    oldFilename = null;
		}
	    }
	}
    }
    oldState = machineState;

    switch (sr.modal.units) {
    case 'G20':
	$('[data-route="workspace"] [id="units"]').text('Inch');
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
	$('[data-route="workspace"] [id="units"]').text('mm');
        mpos.x = Number(mpos.x).toFixed(3);
        mpos.y = Number(mpos.y).toFixed(3);
        mpos.z = Number(mpos.z).toFixed(3);
        wpos.x = Number(wpos.x).toFixed(3);
        wpos.y = Number(wpos.y).toFixed(3);
        wpos.z = Number(wpos.z).toFixed(3);
    }
    wcs = sr.modal.wcs;
    if (sr.line && machineState != HOLD) {
        receivedLines = sr.line;
    }

    // G2core now reports the overrides via properties
    // troe, tro, froe, fro, spoe, and spo, but as of this
    // writing the cncjs server uses the old properties
    // mfo and mto, and does not propagate the new properties
    spindleOverride = 1.0;
    rapidOverride = 1.0;
    feedOverride = 1.0;

    cnc.updateView();
});

setButton = function(name, isEnabled, color, text) {
    var button = $('[data-route="workspace"] .nav-panel ' + name);
    button.prop('disabled', !isEnabled);
    button.prop('style').backgroundColor = color;
    button.prop('innerText', text);
}

var leftButtonHandler;
setLeftButton = function(isEnabled, color, text, click) {
    setButton('.btn-start', isEnabled, color, text);
    leftButtonHandler = click;
}
cnc.doLeftButton = function() {
    if (leftButtonHandler) {
        leftButtonHandler();
    }
}

var rightButtonHandler;
setRightButton = function(isEnabled, color, text, click) {
    setButton('.btn-pause', isEnabled, color, text);
    rightButtonHandler = click;
}
cnc.doRightButton = function() {
    if (rightButtonHandler) {
        rightButtonHandler();
    }
}


cnc.updateView = function() {
    // if (cnc.filename == '') {
    //	canStart = false;
    //}

    var cannotClick = machineWorkflow != MACHINE_IDLE;
    $('[data-route="workspace"] .control-pad .jog-controls .btn').prop('disabled', cannotClick);
    $('[data-route="workspace"] .control-pad .form-control').prop('disabled', cannotClick);
    $('[data-route="workspace"] .mdi .btn').prop('disabled', cannotClick);
    $('[data-route="workspace"] .axis-position .btn').prop('disabled', cannotClick);
    $('[data-route="workspace"] .axis-position .position').prop('disabled', cannotClick);

    var green = '#86f686';
    var red = '#f64646';
    var gray = '#f6f6f6';
    switch (machineWorkflow) {
    case MACHINE_STALL:
        setLeftButton(true, gray, 'Start', null);
        setRightButton(false, gray, 'Pause', null);
        break;
    case MACHINE_IDLE:
        if (cnc.filename != '') {
            // A GCode file is ready to go
            setLeftButton(true, green, 'Start', runGCode);
            setRightButton(false, gray, 'Pause', null);
        } else {
            // Can't start because no GCode to run
            setLeftButton(false, gray, 'Start', null);
            setRightButton(false, gray, 'Pause', null);
        }
        break;
    case MACHINE_HOLD:
        setLeftButton(true, green, 'Resume', resumeGCode);
        setRightButton(true, red, 'Stop', stopGCode);
        break;
    case MACHINE_RUN:
        setLeftButton(false, gray, 'Start', null);
        setRightButton(true, red, 'Pause', pauseGCode);
        break;
    }

    if (spindleSpeed) {
        var spindleText = 'Off';
        switch (spindleDirection) {
        case 'M3': spindleText = 'CW'; break;
        case 'M4': spindleText = 'CCW'; break;
        case 'M5': spindleText = 'Off'; break;
        default:  spindleText = 'Off'; break;
        }
        $('[data-route="workspace"] [id="spindle"]').text(Number(spindleSpeed) + ' RPM ' + spindleText);
    }
    if (running) {
	var elapsed = new Date().getTime() - startTime;
	if (elapsed < 0)
	    elapsed = 0;
	var seconds = Math.floor(elapsed / 1000);
	var minutes = Math.floor(seconds / 60);
	seconds = seconds % 60;
	if (seconds < 10)
	    seconds = '0' + seconds;
	runTime = minutes + ':' + seconds;
    }
    if (runTime) {
        $('[data-route="workspace"] [id="runtime"]').text(runTime);
    }

    $('[data-route="workspace"] [data-name="wpos-label"]').text(wcs);
    if (machineWorkflow == MACHINE_RUN) {
        $('[data-route="workspace"] [data-name="active-state"]').text('Vel ' + velocity.toFixed(2));
    } else {
        stateText = stateName == 'Error' ? "Error: " + errorMessage : stateName;
        $('[data-route="workspace"] [data-name="active-state"]').text(stateText);
    }
    if (machineWorkflow == MACHINE_RUN || machineWorkflow == MACHINE_HOLD) {
        $('[data-route="workspace"] [id="line"]').text(receivedLines);
        scrollToLine(receivedLines);
    }
    $('[data-route="workspace"] [id="wpos-x"]').prop('value', wpos.x);
    $('[data-route="workspace"] [id="wpos-y"]').prop('value', wpos.y);
    $('[data-route="workspace"] [id="wpos-z"]').prop('value', wpos.z);
    if (document.getElementById('units').innerText == 'mm') {
	root.displayer.reDrawTool(wpos.x, wpos.y);
    } else {
	root.displayer.reDrawTool(wpos.x * 25.4, wpos.y * 25.4);
    }
}

controller.on('gcode:load', function(name, gcode) {
    cnc.showGCode(name, gcode);
    if (probing) {
	runGCode();
    }
});

controller.on('workflow:state', function(state) {
    switch(state) {
    case 'idle': cnc.line = 0; break;
    case 'paused': break;
    case 'running': break;
    }

    workflowState = state;
    // We do not update the view yet, because the workflow
    // messages reflect the state of the sender, not the
    // machine.  The machine state usually lags the workflow
    // state, often by a rather long time.  We want the UI
    // to be synchronized to the machine state, so user
    // interactions appear to control the machine directly,
    // without long queue delays.
});

controller.listAllPorts();

// Close
$('[data-route="connection"] [data-name="btn-close"]').on('click', function() {
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
    jQuery.get("../api/watch/files", {token: cnc.token, path: watchPath}, function(data) {
        var selector = $('[data-route="workspace"] select[data-name="select-file"]');
        var legend;
        selector.empty();
        data.files.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (watchPath === '') {
            legend = 'Load GCode File';
            selector.append($("<option disabled />").text(legend));
        } else {
            legend = 'In ' + watchPath;
            selector.append($("<option disabled />").text(legend));
            selector.append($("<option/>").text('..'));
        }

        $.each(data.files, function(index, file) {
	    if (file.type === 'd') {
		selector.append($("<option/>").text(file.name + '/'));
	    }
	});
        $.each(data.files, function(index, file) {
	    if (file.type === 'f' && !file.name.endsWith("~")) {
		selector.append($("<option/>").text(file.name));
	    }
	});
        var selected = cnc.filename.split('/').slice(-1)[0];
        if (selected == '')
            selected = legend;
        $('[data-route="workspace"] select[data-name="select-file"]').val(selected);
    }, "json");
}

cnc.sendFeedOverride =function(deltaPercent) {
    cnc.controller.command('feedOverride', deltaPercent)
}

cnc.showGCode = function(name, gcode) {
    gCodeLoaded = gcode != '';
    if (!gCodeLoaded) {
	gcode = "(No GCode loaded)";
    }
    // $('[data-route="workspace"] .nav-panel .btn-start').prop('disabled', !gcodeLoaded);
    // $('[data-route="workspace"] .nav-panel .btn-start').prop('style').backgroundColor = gcodeLoaded ? '#86f686' : '#f6f6f6';

    cnc.filename = name;
    if (name != "") {
	// gcode = "(" + name + ")<br />" + gcode;
        var basename = name.split('/').slice(-1)[0];
	$('[data-route="workspace"] select[data-name="select-file"]').val(basename);
    } else {
	$('[data-route="workspace"] select[data-name="select-file"]')[0][0].selected = true;
    }
    $('[data-route="workspace"] [id="gcode"]').text(gcode);
    root.displayer.showToolpath(gcode);
    if (machineWorkflow != MACHINE_STALL) {
        cnc.updateView();
    }
}

cnc.getGCode = function() {
    jQuery.get("../api/gcode", {port: cnc.port}, function(res) {
        var gcode = res.data;
        cnc.showGCode("", gcode);
    });
}

cnc.loadGCode = function() {
    cnc.click();
    var filename = $('[data-route="workspace"] select[data-name="select-file"] option:selected')[0].text;
    if (filename === '..') {
        watchPath = watchPath.slice(0, -1).replace(/[^/]*$/,'');
        cnc.filename = '';
        console.log(watchPath);
        cnc.getFileList();
    } else if (filename.endsWith('/')) {
        watchPath = watchPath + filename;
        console.log(watchPath);
        cnc.filename = '';
        cnc.getFileList();
    } else {
        controller.command('watchdir:load', watchPath + filename);
    }
}

$('[data-route="workspace"] select[data-name="select-file"]').change(cnc.loadGCode);

function scrollToLine(lineNumber) {
  var gCodeLines = $('[data-route="workspace"] [id="gcode"]');
  var lineHeight = parseInt(gCodeLines.css('line-height'));
  gCodeLines.scrollTop((lineNumber-2) * lineHeight);
}

runGCode = function() {
    cnc.click();
    running = true;
    cnc.controller.command('gcode:start')
    startTime = new Date().getTime();
}

pauseGCode = function() {
    cnc.click();
    cnc.controller.command('gcode:pause');
}

resumeGCode = function() {
    cnc.click();
    cnc.controller.command('gcode:resume');
}

stopGCode = function() {
    cnc.click();
    userStopRequested = true;
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

    // $('[data-route="connection"] [data-name="msg"]').html('Trying');
    if (port) {
	controller.openPort(port, {
            controllerType: controllerType,
            baudrate: Number(baudrate)
	});
    }
}
);

//
// Workspace
//
$('[data-route="workspace"] [data-name="btn-dropdown"]').dropdown();
$('[data-route="workspace"] [data-name="active-state"]').text('NoConnect');
$('[data-route="workspace"] select[data-name="select-distance"]').val('1');

});
