/**
 * jQuery.NumPad
 *
 * Copyright (c) 2015 Andrej Kabachnik
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 * https://github.com/kabachello/jQuery.NumPad
 *
 * Version: 1.4
 *
 */
(function($){

	// From https://stackoverflow.com/questions/4963053/focus-to-input-without-scrolling
	var cursorFocus = function(elem) {
		var x = window.scrollX, y = window.scrollY;
		elem.focus();
		window.scrollTo(x, y);
	}
	
    $.fn.numpad=function(options){
    	
    	if (typeof options == 'string'){
    		var nmpd = $.data(this[0], 'numpad');
    		if (!nmpd) throw "Cannot perform '" + options + "' on a numpad prior to initialization!";
    		switch (options){
    			case 'open': 
    				nmpd.open(nmpd.options.target ? nmpd.options.target : this.first());
    				break;
    			case 'close':
    				nmpd.open(nmpd.options.target ? nmpd.options.target : this.first());
    				break;
    		}
    		return this;
    	} 
    	
		// Apply the specified options overriding the defaults
		options = $.extend({}, $.fn.numpad.defaults, options);
		
		// Create a numpad. One for all elements in this jQuery selector.
		// Since numpad() can be called on multiple elements on one page, each call will create a unique numpad id.
		var id = 'nmpd' + ($('.nmpd-wrapper').length + 1);
		var nmpd = {};
		return this.each(function(){
			
			// If an element with the generated unique numpad id exists, the numpad had been instantiated already.
			// Otherwise create a new one!
			if ($('#'+id).length == 0) {
				/** @var nmpd jQuery object containing the entire numpad */
				nmpd = $('<div id="' + id + '"></div>').addClass('nmpd-wrapper');
				nmpd.options = options;
				/** @var display jQuery object representing the display of the numpad (typically an input field) */
				nmpd.s0 =  $(options.displayTpl).addClass('nmpd-display');
				nmpd.s1 =  $(options.displayTpl).addClass('nmpd-display');
				nmpd.s2 =  $(options.displayTpl).addClass('nmpd-display');
				nmpd.display = $(options.displayTpl).addClass('nmpd-display');
				nmpd.autopush = true;
				/** @var grid jQuery object containing the grid for the numpad: the display, the buttons, etc. */
				var table = $(options.gridTpl).addClass('nmpd-grid');
				nmpd.grid = table;
				table.append($(options.rowTpl)
					     .append($(options.displayCellTpl).append(nmpd.s2).append($('<input type="hidden" class="dirty" value="0"></input>')))
					     .append($(options.cellTpl).append($(options.buttonFunctionTpl).html('Roll').addClass('roll').click(function(){
						 nmpd.roll();
					     })))
					     .append($(options.cellTpl).append($(options.buttonFunctionTpl).html('SIN').addClass('sin').click(function(){
						 nmpd.sin();
					     })))
					    );
				table.append($(options.rowTpl)
					     .append($(options.displayCellTpl).append(nmpd.s1).append($('<input type="hidden" class="dirty" value="0"></input>')))
					     .append($(options.cellTpl).append($(options.buttonFunctionTpl).html('Drop').addClass('drop').click(function(){
						 nmpd.drop();
					     })))
					     .append($(options.cellTpl).append($(options.buttonFunctionTpl).html('COS').addClass('cos').click(function(){
						 nmpd.cos();
					     })))
					    );
				table.append($(options.rowTpl)
					     .append($(options.displayCellTpl).append(nmpd.s0).append($('<input type="hidden" class="dirty" value="0"></input>')))
					     .append($(options.cellTpl).append($(options.buttonFunctionTpl).html('Swap').addClass('swap').click(function(){
						 nmpd.swap();
					     })))
					     .append($(options.cellTpl).append($(options.buttonFunctionTpl).html('TAN').addClass('tan').click(function(){
						 nmpd.tan();
					     })))
					    );
				table.append($(options.rowTpl)
					     .append($(options.displayCellTpl).append(nmpd.display).append($('<input type="hidden" class="dirty" value="0"></input>')))
					     .append($(options.cellTpl).append($(options.buttonFunctionTpl).html('Enter').addClass('enter').click(function(){
						 nmpd.push();
					     })))
					     .append($(options.cellTpl).append($(options.buttonFunctionTpl).html('SQRT').addClass('sqrt').click(function(){
						 nmpd.sqrt();
					     })))
					    );
				// Create rows and columns of the the grid with appropriate buttons
				table.append(
					$(options.rowTpl)
						.append($(options.cellTpl).append($(options.buttonNumberTpl).html(7).addClass('numero')))
						.append($(options.cellTpl).append($(options.buttonNumberTpl).html(8).addClass('numero')))
						.append($(options.cellTpl).append($(options.buttonNumberTpl).html(9).addClass('numero')))
						.append($(options.cellTpl).append($(options.buttonFunctionTpl).html(options.textDelete).addClass('del').click(function(){
							nmpd.setValue(nmpd.getValue().toString().substring(0,nmpd.getValue().toString().length - 1));
						})))
						.append($(options.cellTpl).append($(options.buttonFunctionTpl).html('+').addClass('plus').click(function(){
							nmpd.plus();
						})))
					).append(
					$(options.rowTpl)
						.append($(options.cellTpl).append($(options.buttonNumberTpl).html(4).addClass('numero')))
						.append($(options.cellTpl).append($(options.buttonNumberTpl).html(5).addClass('numero')))
						.append($(options.cellTpl).append($(options.buttonNumberTpl).html(6).addClass('numero')))
						.append($(options.cellTpl).append($(options.buttonFunctionTpl).html(options.textClear).addClass('clear').click(function(){
							nmpd.setValue('');
						})))
						.append($(options.cellTpl).append($(options.buttonFunctionTpl).html('-').addClass('minus').click(function(){
							nmpd.minus();
						})))

					).append(
					$(options.rowTpl)
						.append($(options.cellTpl).append($(options.buttonNumberTpl).html(1).addClass('numero')))
						.append($(options.cellTpl).append($(options.buttonNumberTpl).html(2).addClass('numero')))
						.append($(options.cellTpl).append($(options.buttonNumberTpl).html(3).addClass('numero')))
						.append($(options.cellTpl).append($(options.buttonFunctionTpl).html(options.textCancel).addClass('cancel').click(function(){
							nmpd.close(false);
						})))
						.append($(options.cellTpl).append($(options.buttonFunctionTpl).html('*').addClass('times').click(function(){
							nmpd.times();
						})))
					).append(
					$(options.rowTpl)
						.append($(options.cellTpl).append($(options.buttonFunctionTpl).html('&plusmn;').addClass('neg').click(function(){
							nmpd.autopush = false;
							nmpd.setValue(nmpd.getValue() * (-1));
						})))
						.append($(options.cellTpl).append($(options.buttonNumberTpl).html(0).addClass('numero')))
						.append($(options.cellTpl).append($(options.buttonFunctionTpl).html(options.decimalSeparator).addClass('sep').click(function(){
							var val;
							if ($('#'+id+' .dirty').val() == '0'){
								val = '0';
							} else {
								val = nmpd.getValue() ? nmpd.getValue().toString() : '0';
							}

							nmpd.setValue(val + options.decimalSeparator);
						})))
						.append($(options.cellTpl).append($(options.buttonFunctionTpl).html(options.textDone).addClass('done')))
						.append($(options.cellTpl).append($(options.buttonFunctionTpl).html('/').addClass('divide').click(function(){
							nmpd.divide();
						})))
					);
				// Create the backdrop of the numpad - an overlay for the main page
				nmpd.append($(options.backgroundTpl).addClass('nmpd-overlay').click(function(){nmpd.close(false);}));
				// Append the grid table to the nmpd element
				nmpd.append(table);
				
				// Hide buttons to be hidden
				if (options.hidePlusMinusButton){
					nmpd.find('.neg').hide();
				}
				if (options.hideDecimalButton){
					nmpd.find('.sep').hide();
				}
				
				// Attach events
				if (options.onKeypadCreate){
					nmpd.on('numpad.create', options.onKeypadCreate);
				}
				if (options.onKeypadOpen){
					nmpd.on('numpad.open', options.onKeypadOpen);
				}
				if (options.onKeypadClose){
					nmpd.on('numpad.close', options.onKeypadClose);
				}
				if (options.onChange){
					nmpd.on('numpad.change', options.onChange);
				}
				(options.appendKeypadTo ? options.appendKeypadTo : $(document.body)).append(nmpd);   
				
				// Special event for the numeric buttons
				$('#'+id+' .numero').bind('click', function(){
					var val;
					if ($('#'+id+' .dirty').val() == '0'){
						val = $(this).text();
					} else {
						val = nmpd.getValue() ? nmpd.getValue().toString() + $(this).text() : $(this).text();
					}
					nmpd.setValue(val);	
				});
				
				// Finally, once the numpad is completely instantiated, trigger numpad.create
				nmpd.trigger('numpad.create');
			} else {
				// If the numpad was already instantiated previously, just load it into the nmpd variable
				//nmpd = $('#'+id);
				//nmpd.display = $('#'+id+' input.nmpd-display');	
			}
			
			$.data(this, 'numpad', nmpd);
			
			// Make the target element readonly and save the numpad id in the data-numpad property. Also add the special nmpd-target CSS class.
			$(this).attr("readonly", true).attr('data-numpad', id).addClass('nmpd-target');
			
			// Register a listener to open the numpad on the event specified in the options
			$(this).bind(options.openOnEvent,function(){
				nmpd.open(options.target ? options.target : $(this));
			});
			
			// Define helper functions
			
			/**
			* Gets the current value displayed in the numpad
			* @return string | number
			*/
			nmpd.getValue = function(){
				return isNaN(nmpd.display.val()) ? 0 : nmpd.display.val();
			};
			
			/**
			* Sets all the dirty bits to 0 so the next number will overwrite the display
			*/
			nmpd.clean = function(){
				nmpd.find('.dirty').val('0');
			};

			/**
			* Sets the display value of the numpad
			* @param string value
			* @return jQuery object nmpd
			*/
			nmpd.setValue = function(value){
				if (nmpd.display.attr('maxLength') < value.toString().length) value = value.toString().substr(0, nmpd.display.attr('maxLength'));
				if (nmpd.autopush) {
					nmpd.push();
				}
				nmpd.display.val(value);
				nmpd.find('.dirty').val('1');
				nmpd.trigger('numpad.change', [value]);
				return nmpd;
			};
			
			/**
			* Push the display value onto the stack
			* @return jQuery object nmpd
			*/
			nmpd.push = function(){
				nmpd.s2.val(nmpd.s1.val());
				nmpd.s1.val(nmpd.s0.val());
				nmpd.s0.val(nmpd.getValue());
				nmpd.clean();
				nmpd.autopush = false;
				nmpd.display.val('');
				return nmpd;
			};

			/**
			* Pop the stack
			* @return the previous top of stack
			*/
			nmpd.pop = function(){
				var ret = nmpd.s0.val();
				nmpd.s0.val(nmpd.s1.val());
				nmpd.s1.val(nmpd.s2.val());
				// nmpd.s2.val('');  // Last on stack duplicates on pop
				return ret;
			}

			/**
			* Rotate the stack through the display value
			* @return jQuery object nmpd
			*/
			nmpd.roll = function(){
				var tmp = nmpd.getValue();
				nmpd.drop();
				nmpd.s2.val(tmp);
				return nmpd;
			}

			/**
			* Exchange the top of the stack with the display value
			* @return jQuery object nmpd
			*/
			nmpd.swap = function(){
				var tmp = nmpd.s0.val();
				nmpd.s0.val(nmpd.getValue());
				nmpd.autopush = false;
				nmpd.setValue(tmp);
				nmpd.clean();
				nmpd.autopush = true;
				return nmpd;
			}

			/**
			* Pop the stack into the display value
			* @return jQuery object nmpd
			*/
			nmpd.drop = function(){
				nmpd.autopush = false;
				nmpd.setValue(nmpd.pop());
				nmpd.clean();
				nmpd.autopush = true;
				return nmpd;
			}

			/**
			* Round to the indicated precision
			* @param number to round
			* @param number of postdecimal digits
			* @return jQuery object nmpd
			*/
			nmpd.round = function(number, precision) {
				var shift = function (number, exponent) {
					var numArray = ("" + number).split("e");
					return +(numArray[0] + "e" + (numArray[1] ? (+numArray[1] + exponent) : exponent));
				};
				return shift(Math.round(shift(number, +precision)), -precision);
			}

			/**
			* Set the display value to the given value and arrange for the next number to push
			* @param value
			* @return jQuery object nmpd
			*/
			nmpd.calcValue = function(value) {
				nmpd.autopush = false;
				nmpd.setValue(nmpd.round(value, nmpd.options.precision));
				nmpd.clean();
				nmpd.autopush = true;
				return nmpd;
			};

			/**
			* Convert degrees to radians
			* @param degrees
			* @return radians
			*/
			nmpd.radians = function() {
				return Number(nmpd.getValue()) / 180. * Math.PI;
			}

			/**
			* Replace the display value with its square root
			* @return jQuery object nmpd
			*/
			nmpd.sqrt = function(){
				return nmpd.calcValue(Math.sqrt(nmpd.getValue()));
			};

			/**
			* Replace the display value (in degrees) with its cosine
			* @return jQuery object nmpd
			*/
			nmpd.cos = function(){
				return nmpd.calcValue(Math.cos(nmpd.radians()));
			};

			/**
			* Replace the display value (in degrees) with its sine
			* @return jQuery object nmpd
			*/
			nmpd.sin = function(){
				return nmpd.calcValue(Math.sin(nmpd.radians()));
			};

			/**
			* Replace the display value (in degrees) with its tangent
			* @return jQuery object nmpd
			*/
			nmpd.tan = function(){
				return nmpd.calcValue(Math.tan(nmpd.radians()));
			};

			/**
			* Add the display value to the top of the stack
			* @return jQuery object nmpd
			*/
			nmpd.plus = function(){
				return nmpd.calcValue(Number(nmpd.pop()) + Number(nmpd.getValue()));
			};

			/**
			* Subtract the display value from the top of the stack
			* @return jQuery object nmpd
			*/
			nmpd.minus = function(){
			    return nmpd.calcValue(Number(nmpd.pop()) - Number(nmpd.getValue()));
			};

			/**
			* Multiply the display value by the top of the stack
			* @return jQuery object nmpd
			*/
			nmpd.times = function(){
				return nmpd.calcValue(Number(nmpd.pop()) * Number(nmpd.getValue()));
			};

			/**
			* Divide the display value by the top of the stack
			* @return jQuery object nmpd
			*/
			nmpd.divide = function(){
				return nmpd.calcValue(Number(nmpd.pop()) / Number(nmpd.getValue()));
			};

			/**
			* Closes the numpad writing it's value to the given target element
			* @param jQuery object target
			* @return jQuery object nmpd
			*/
			nmpd.close = function(target){
				// If a target element is given, set it's value to the dipslay value of the numpad. Otherwise just hide the numpad
				if (target){
					if (target.prop("tagName") == 'INPUT'){
						target.val(nmpd.getValue().toString().replace('.', options.decimalSeparator));
					} else {
						target.html(nmpd.getValue().toString().replace('.', options.decimalSeparator));
					}
				}	
				// Hide the numpad and trigger numpad.close
				nmpd.hide();
				nmpd.trigger('numpad.close');
				// Trigger a change event on the target element if the value has really been changed
				// TODO check if the value has really been changed!
				if (target && target.prop("tagName") == 'INPUT'){
					target.trigger('change');
				}
				return nmpd;
			};
			
			/**
			* Opens the numpad for a given target element optionally filling it with a given value
			* @param jQuery object target
			* @param string initialValue
			* @return jQuery object nmpd
			*/
			nmpd.open = function(target, initialValue){
				// Set the initial value
				// Use nmpd.display.val to avoid triggering numpad.change for the initial value
				if (initialValue){
					nmpd.display.val(initialValue);
				} else {
					if (target.prop("tagName") == 'INPUT'){
						nmpd.display.val(target.val());
						nmpd.display.attr('maxLength', target.attr('maxLength'));
					} else {
						nmpd.display.val(isNaN(parseFloat(target.text())) ? '' : parseFloat(target.text()));
					}
				}
				// Mark the numpad as not dirty initially
				$('#'+id+' .dirty').val(0);
				// Show the numpad and position it on the page
				cursorFocus(nmpd.show().find('.cancel'));
				position(nmpd.find('.nmpd-grid'), options.position, options.positionX, options.positionY);
				// Register a click handler on the done button to update the target element
				// Make sure all other click handlers get removed. Otherwise some unwanted sideeffects may occur if the numpad is
				// opened multiple times for some reason
				$('#'+id+' .done').off('click');
				$('#'+id+' .done').one('click', function(){ nmpd.close(target); });
				// Finally trigger numpad.open
				nmpd.trigger('numpad.open');
				nmpd.autopush = true;
				return nmpd;
			};		  
		});
    };
    
	/**
	* Positions any given jQuery element within the page
	*/
    function position(element, mode, posX, posY) {
    	var x = 0;
    	var y = 0;
    	if (mode == 'fixed'){
	        element.css('position','fixed');
	        
	        if (posX == 'left'){
	        	x = 0;
	        } else if (posX == 'right'){
	        	x = $(window).width() - element.outerWidth();
	        } else if (posX == 'center'){
	        	x = ($(window).width() / 2) - (element.outerWidth() / 2);
	        } else if ($.type(posX) == 'number'){
	        	x = posX;
	        }
	        element.css('left', x);
	        	        
	        if (posY == 'top'){
	        	y = 0;
	        } else if (posY == 'bottom'){
	        	y = $(window).height() - element.outerHeight();
	        } else if (posY == 'middle'){
	        	y = ($(window).height() / 2) - (element.outerHeight() / 2);
	        } else if ($.type(posY) == 'number'){
	        	y = posY;
	        }
	        element.css('top', y);
    	}
        return element;
    }
	
	// Default values for numpad options
	$.fn.numpad.defaults = {
		target: false,
		openOnEvent: 'click',
		backgroundTpl: '<div></div>',
		gridTpl: '<table></table>',
		displayTpl: '<input type="text" />',
		displayCellTpl: '<td colspan="3"></td>',
		rowTpl: '<tr></tr>',
		cellTpl: '<td></td>',
		buttonNumberTpl: '<button></button>',
		buttonFunctionTpl: '<button></button>',
		gridTableClass: '',
		hidePlusMinusButton: false,
		hideDecimalButton: false,
		textDone: 'Done',
		textDelete: 'Del',
		textClear: 'Clear',
		textCancel: 'Cancel',
		decimalSeparator: ',',
		precision: 4,
		appendKeypadTo: false,
		position: 'fixed',
		positionX: 'center',
		positionY: 'middle',
		onKeypadCreate: false,
		onKeypadOpen: false,
		onKeypadClose: false,
		onChange: false
	};
})(jQuery);
