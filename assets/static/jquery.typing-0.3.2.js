// jQuery-typing
//
// Version: 0.3.2
// Website: http://tnajdek.github.io/jquery-typing/
// License: public domain <http://unlicense.org/>
// Author:  Maciej Konieczny <hello@narf.pl>
// Author (Events & data-api): Tom Najdek <tom@doppnet.com>

(function ($) {

	//--------------------
	//  jQuery extension
	//--------------------

	$.fn.typing = function (options) {
		return this.each(function (i, elem) {
			var	$elem = $(elem),
				api;
			
			if(!$elem.data('typing')) {
				api = new Typing(elem, options);
				$elem.data('typing', api);
			}
		});
	};


	//-------------------
	//  actual function
	//-------------------

	var Typing = function(elem, options) {
		// create other function-scope variables
		var $elem = $(elem),
			typing = false,
			delayedCallback,
		// override default settings
			settings = $.extend({
				start: null,
				stop: null,
				delay: 400
			}, options);

		//export settings to the api
		this.settings = settings;
	

		// start typing
		function startTyping(event) {
			if (!typing) {
				// set flag and run callback
				typing = true;
				$elem.trigger('typing:start');
				if (settings.start) {
					settings.start(event, $elem);
				}
			}
		}

		// stop typing
		function stopTyping(event, delay) {
			if (typing) {
				// discard previous delayed callback and create new one
				clearTimeout(delayedCallback);
				delayedCallback = setTimeout(function () {
					// set flag and run callback
					typing = false;
					$elem.trigger('typing:stop');
					if (settings.stop) {
						settings.stop(event, $elem);
					}
				}, delay >= 0 ? delay : settings.delay);
			}
		}

		// listen to regular keypresses
		$elem.keypress(startTyping);

		// listen to backspace and delete presses
		$elem.keydown(function (event) {
			if (event.keyCode === 8 || event.keyCode === 46) {
				startTyping(event);
			}
		});

		// listen to keyups
		$elem.keyup(stopTyping);

		// listen to blurs
		$elem.blur(function (event) {
			stopTyping(event, 0);
		});
	};

	//provide data-api bootstrap style (http://rc.getbootstrap.com/javascript.html)
	$(document).on('focus.typing.data-api', '[data-provide=typing]', function (e) {
		var $this = $(this),
		delay = $this.data('typingDelay');
		$this.typing( {
			delay: delay
		});
	});

})(jQuery);
