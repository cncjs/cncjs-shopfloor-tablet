// This file was derived from
//    https://github.com/cncjs/gcode-parser/blob/master/src/index.js
// by extracting just the parseLine() function and using Babel to
// translate that to older Javascript

'use strict';

// @param {string} line The G-code line
var parseLine = function () {
    // http://reprap.org/wiki/G-code#Special_fields
    // The checksum "cs" for a GCode string "cmd" (including its line number) is computed
    // by exor-ing the bytes in the string up to and not including the * character.
    var computeChecksum = function computeChecksum(s) {
        s = s || '';
        if (s.lastIndexOf('*') >= 0) {
            s = s.substr(0, s.lastIndexOf('*'));
        }

        var cs = 0;
        for (var i = 0; i < s.length; ++i) {
            var c = s[i].charCodeAt(0);
            cs ^= c;
        }
        return cs;
    };
    // http://linuxcnc.org/docs/html/gcode/overview.html#gcode:comments
    // Comments can be embedded in a line using parentheses () or for the remainder of a lineusing a semi-colon. The semi-colon is not treated as the start of a comment when enclosed in parentheses.
    var stripComments = function () {
        var re1 = new RegExp(/\s*\([^\)]*\)/g); // Remove anything inside the parentheses
        var re2 = new RegExp(/\s*;.*/g); // Remove anything after a semi-colon to the end of the line, including preceding spaces
        var re3 = new RegExp(/\s+/g);
        return function (line) {
            return line.replace(re1, '').replace(re2, '').replace(re3, '');
        };
    }();
    var re = /(%.*)|((?:\$\$)|(?:\$[a-zA-Z0-9#]*))|([a-zA-Z][0-9\+\-\.]*)|(\*[0-9]+)/igm;

    return function (line, options) {
        options = options || {};
        options.flatten = !!options.flatten;
        options.noParseLine = !!options.noParseLine;

        var result = {
            line: line
        };

        if (options.noParseLine) {
            return result;
        }

        result.words = [];

        var ln = void 0; // Line number
        var cs = void 0; // Checksum
        var words = stripComments(line).match(re) || [];

        for (var i = 0; i < words.length; ++i) {
            var word = words[i];
            var letter = word[0].toUpperCase();
            var argument = word.slice(1);

            // Parse % commands for bCNC and CNCjs
            // - %wait Wait until the planner queue is empty
            if (letter === '%') {
                result.cmds = (result.cmds || []).concat(line.trim());
                continue;
            }

            // Parse $ commands for Grbl
            // - $C Check gcode mode
            // - $H Run homing cycle
            if (letter === '$') {
                result.cmds = (result.cmds || []).concat('' + letter + argument);
                continue;
            }

            // N: Line number
            if (letter === 'N' && typeof ln === 'undefined') {
                // Line (block) number in program
                ln = Number(argument);
                continue;
            }

            // *: Checksum
            if (letter === '*' && typeof cs === 'undefined') {
                cs = Number(argument);
                continue;
            }

            var value = Number(argument);
            if (Number.isNaN(value)) {
                value = argument;
            }

            if (options.flatten) {
                result.words.push(letter + value);
            } else {
                result.words.push([letter, value]);
            }
        }

        // Line number
        typeof ln !== 'undefined' && (result.ln = ln);

        // Checksum
        typeof cs !== 'undefined' && (result.cs = cs);
        if (result.cs && computeChecksum(line) !== result.cs) {
            result.err = true; // checksum failed
        }

        return result;
    };
}();
