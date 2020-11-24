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
* 2D toolpath display with tool position tracking

The layout is optimized for use on tablet computers.  It works well on inexpensive tablets, even those with a slow GPU, since it does not use 3D graphics.

It can be used as the only UI for running complete jobs - choosing the program, setting up the work coordinate system, and controlling the run.

The full cncjs UI can still be used, perhaps on a different computer or in a different browser tab on the same computer, if its advanced capabilities are required for something that cncjs-shopfloor-tablet does not support.  The intention is that cncjs-shopfloor-tablet is sufficient for daily use in a production environment.

### Limitations

It works well with TinyG/g2core and GRBL.  It has been tested a little with Marlin but not extensively.  It has not been tested with Smoothieware - but Smoothie and GRBL are quite similar from a protocol standpoint so it is likely to work.

Rotary axis A is supported from the GUI, but not B and C.  You can issue GCode commands for those axes manually via the MDI boxes.  The A axis GUI support includes a DRO, Set and GoTo functions, but not jog buttons.  There is a Home A menu entry in the dropdown menu.

### Setup

Get the cncjs-shopfloor-tablet files onto the machine control computer that runs the cncjs app, either by cloning the git tree or by downloading and extracting a .zip.

Create a subdirectory to contain GCode files, for example "/home/pi/GCode".

```
$ mkdir /home/pi/GCode
```

Edit the .cncrc file in your home directory, adding a "watch directory" to hold GCode files, and adding a "mount point" to attach the shopfloor-tablet code to the CNCjs server.  You need to add lines like these to .cncrc, somewhere after the opening brace:

```
    "watchDirectory": "/home/pi/GCode",
    "mountPoints": [
        {
            "route": "/tablet",
            "target": "/home/pi/cncjs-shopfloor-tablet/src/"
        }
     ],   
```

You can use any text editor to edit that file.  On a Raspberry Pi, the most common such editor is called "nano".  The Internet has tutorials for using it.

After editing that file, you will need to restart the CNCjs server to make it see these new lines.  One way to do that is to reboot the machine that runs the CNCjs server.

After you have restarted the server, browse to the url 'http://*host*:8000/tablet/', where *host* is the name or IP address of the cncjs server.

You can still use the full cncjs UI by browsing 'http://*host*:8000'. You can use the different UI's simultaneously in different browser windows or tabs, which can be on different machines if you wish.

### Usage

![cncjs-shopfloor-tablet](https://user-images.githubusercontent.com/4861133/100148429-d9b16b80-2e40-11eb-8bc0-7c80a1b27a9f.png)

From left to right, top to bottom, the screen elements are:
* The legend in the upper left hand corner shows the current controller state and sometimes error messages.
* There are two program control buttons that change according to the program state
    * The left button is generalized "Go", while the right is generalized "Stop"
    * The idea is that the left one is always the "accelerator" and the right the "brake"
    * If no program is loaded, neither button is active (both are greyed out)
    * If a program is loaded but not running, the left button is green/Start
    * When a program is running, the right button is red, labeled Pause
    * Then a program is paused, the left one is green/Resume and the right is red/Stop
    * When a program is running, hitting the "brake" (right button) pauses exection.  From there you can decide whether to Resume or Stop (go back to idle state).
* The number to the right of the control buttons is the number of program lines that have been executed.
* The number to the right of that is the program run time.
* The button in the upper right corner is a drop-down menu with miscellaneous functions that are used infrequently.
* "G54" shows the current work coordinate system - G54, G55, .. G59.  To change the coordinate system manually you can enter e.g. G55 in an MDI box.
* The gray "DRO" boxes labeled X, Y, Z, A show the current work coordinate for that axis.  Touching a DRO box brings up an RPN calculator in which you can enter or calculate a new value.  Having entered the value, you can exit from the calculator with Cancel (does nothing), GoTo (rapid move to the new location) or Set (change the work coordinate to the new value).
* You can use the calculator to quickly perform custom jogs, as follows: When the calculator starts, the current location is pre-entered.  If you type a number followed by + or -, the new number will be added to or subtracted from the current location. You can then hit GoTo.
* The **Inch** or **mm** button shows the currently-active units, and toggles them if clicked.  Switching units also changes the jog increment selections.
* **X=** **Y=** **Z=** set the axis work coordinate to the value in the number box above
* **X=0** **Y=0** **Z=0** **A=0** set the axis work coordinate to 0
* **->X0** **->Y0** **->Z0** **->A0" rapid to work 0 for that axis
* **0.001** .. **5** set the jog increment.  The selection of increments changes according to the units (Inch or mm).
* The selector box between **Z+** and **Z-** shows the current jog increment, and, when clicked, permits the choice of some additional jog increments.
* **X-** **X+** **Y-** **Y+** **Z-** **Z+** jog by the current increment.  You can jog continuously by selecting a large increment, starting the jog, then hitting **Stop** when it has gone far enough.
* **MDI** sends the GCode command entered in the box to its left.  To resend that command, click **MDI** again.  There are MDI blocks so you can have two different GCode commands "queued up" for easy execution.
* To load a GCode file from the cncjs server's watch directory, select it from the file selector at the lower left.  Its GCode text will be displayed in the scrollable textarea to the right and the X-Y projection of its toolpath will be displayed in the image area to the right of that.
* **Rfrsh** refreshes the file selector list.  That is useful if additional files are added to the watch directory.  Another way to refresh the file list is to reload the page.
* **Load** reloads the GCode program from the currently selected file.  That is useful if you edit the file from another computer and want to pick up the new version.  To reload it directly from the file selector, you would have to first select a different file and then re-select the edited one (because of the way selector ".change" events work).
* If the file selector is blank and there is GCode text in the GCode display text area, the GCode is probably a macro loaded by a different cncjs session.
* The text box to the right of MDI shows the currently loaded GCode program.  You can scroll it by swiping in the box.  When a program is running, the currently executing line is highlighted.  The highlighted line is sometimes wrong due to the fact that the CNCjs server filters out blank lines, so the line that the controller reports is sometimes a little off compared to the raw text in the file.
* The graphic window in the lower right shows the toolpath looking down from the top.  Feedrate (cutting) moves are shown in blue, with rapid moves in green.There is a crosshair reticle at the origin, and the current tool position is shown as a pink circle.  The numbers are the motion limits in X and Y.
* The scrollable Serial Messages box shows selected serial messages from the controller, filtering out very common protocol and flow control messages that are generally uninteresting.  The messages that are shown include error and alarm messages, and responses to inquiries that you enter in MDI boxes.
