# cncjs-shopfloor-tablet

### A stable cncjs UI for machine operators

The normal cncjs UI is too complex for production use on a shop floor.  The many widgets, small buttons, complex screen repositioning, and developer-level information displays get in the way of a machine operator's needs for predictability and ease of access to the most important and frequently-used functions.

The cncjs-pendant-* UIs are great for simple jogging, but lack functions needed for running a complete job.

This project builds on cncjs-pendant-tinyweb to create a UI suitable for running production jobs.  It adds the following capabilities to cncjs-pendant-tinyweb:

* Loading GCode files from the cncjs server's watch directory
* Text display of the currently loaded GCode file
* Two MDI (Manual Data Input) boxes to run arbitray GCode commands
* Goto specific coordinates
* Set the work coordinates to specified values (not just zero)
* Direct buttons (bypassing the dropdown) for setting the jog increment
* Automatic reconnect to most-recently-used serial port
* State-driven highlighting of applicable program-control buttons
* Separation between important buttons to reduce accidental touches
* Removal of semi-dangerous buttons like diagonal jogs (diagonal jogging requires the operator to monitor two simultaneous motions, which pushes human attention limits)

The layout is optimized for use on tablet computers.  It works well on inexpensive tablets, even those with a slow GPU, since it does not use 3D graphics.

It can be used as the only UI for running complete jobs - choosing the program, setting up the work coordinate system, and controlling the run.

The full cncjs UI can still be used, perhaps on a different computer or in a different browser tab on the same computer, if its advanced capabilities are required for some step such as pre-visualizing the GCode geometry.

### Limitations

It has only been tested with TinyG.  It may work, for the most part, with GRBL and Smoothie, but the state-driven highlighting of program-control buttons has not yet been ported to GRBL and Smoothie.

### Setup

Get the cncjs-shopfloor-tablet files onto the machine control computer that runs the cncjs app, either by cloning the git tree or by downloading and extracting a .zip.

Use cnc's -m option to set up a static mount.  Assuming that the cncjs-shopfloor-table files are in the directory /home/pi/cncjs-shopfloor-tablet, the command would be:

```
$ cnc -m /tablet:/home/pi/cncjs-shopfloor-table
```

Then browse to the url 'http://<host>:8000/tablet/', where <host> is the name or IP address of the cncjs server.
