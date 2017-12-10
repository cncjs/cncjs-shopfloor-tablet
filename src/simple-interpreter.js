/* eslint no-continue: 0 */
// This file was derived from
// https://github.com/cncjs/gcode-interpreter/blob/master/src/Interpreter.js
// as follows:
// a) Removed the import and export sections, and manually translated from
//    class syntax to prototype syntax, for compatibility with old browsers
// b) Removed all of the load* methods, replacing them with a single method
//    loadFromLinesSync().  Since we know that the interpreter will be called
//    twice, first to determine the bounding box (for sizing the canvas) and
//    then to render onto the canvas, the gcode string can be broken into an
//    array of lines once and that array reused for both passes.  This also
//    eliminates the need for a parseStringSync() function in simple-parser;
//    the only necessary function is parseLine().
// c) Replaced const with var
// d) Replaced arrow functions with real functions
// e) Replaced let with var

/**
 * Returns an object composed from arrays of property names and values.
 * @example
 *   fromPairs([['a', 1], ['b', 2]]);
 *   // => { 'a': 1, 'b': 2 }
 */
var fromPairs = function(pairs) {
    var index = -1;
    var length = (!pairs) ? 0 : pairs.length;
    var result = {};

    while (++index < length) {
        var pair = pairs[index];
        result[pair[0]] = pair[1];
    }

    return result;
};

var partitionWordsByGroup = function(words = []) {
    var groups = [];

    for (var i = 0; i < words.length; ++i) {
        var word = words[i];
        var letter = word[0];

        if ((letter === 'G') || (letter === 'M') || (letter === 'T')) {
            groups.push([word]);
            continue;
        }

        if (groups.length > 0) {
            groups[groups.length - 1].push(word);
        } else {
            groups.push([word]);
        }
    }

    return groups;
};

var interpret = function(self, data) {
    var groups = partitionWordsByGroup(data.words);

    for (var i = 0; i < groups.length; ++i) {
        var words = groups[i];
        var word = words[0] || [];
        var letter = word[0];
        var code = word[1];
        var cmd = '';
        var args = {};

        if (letter === 'G') {
            cmd = (letter + code);
            args = fromPairs(words.slice(1));

            // Motion Mode
            if (code === 0 || code === 1 || code === 2 || code === 3 || code === 38.2 || code === 38.3 || code === 38.4 || code === 38.5) {
                self.motionMode = cmd;
            } else if (code === 80) {
                self.motionMode = '';
            }
        } else if (letter === 'M') {
            cmd = (letter + code);
            args = fromPairs(words.slice(1));
        } else if (letter === 'T') { // T1 ; w/o M6
            cmd = letter;
            args = code;
        } else if (letter === 'F') { // F750 ; w/o motion command
            cmd = letter;
            args = code;
        } else if (letter === 'X' || letter === 'Y' || letter === 'Z' || letter === 'A' || letter === 'B' || letter === 'C' || letter === 'I' || letter === 'J' || letter === 'K') {
            // Use previous motion command if the line does not start with G-code or M-code.
            // @example
            //   G0 Z0.25
            //   X-0.5 Y0.
            //   Z0.1
            //   G01 Z0. F5.
            //   G2 X0.5 Y0. I0. J-0.5
            //   X0. Y-0.5 I-0.5 J0.
            //   X-0.5 Y0. I0. J0.5
            // @example
            //   G01
            //   M03 S0
            //   X5.2 Y0.2 M03 S0
            //   X5.3 Y0.1 M03 S1000
            //   X5.4 Y0 M03 S0
            //   X5.5 Y0 M03 S0
            cmd = self.motionMode;
            args = fromPairs(words);
        }

        if (!cmd) {
            continue;
        }

        if (typeof self.handlers[cmd] === 'function') {
            var func = self.handlers[cmd];
            func(args);
        }

        if (typeof self[cmd] === 'function') {
            var func = self[cmd].bind(self);
            func(args);
        }
    }
};

function Interpreter(options) {
    this.motionMode = 'G0';
    this.handlers = {};

    options = options || {};
    options.handlers = options.handlers || {};

    this.handlers = options.handlers;
}

Interpreter.prototype.loadFromLinesSync = function(lines) {
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i].trim();
        if (line.length !== 0) {
	    interpret(this, parseLine(line, {}));
        }
    }
}
