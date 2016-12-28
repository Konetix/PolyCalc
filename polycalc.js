if (!jQuery || !CSSParser || !Modernizr) {
	alert("PolyCalc requires jQuery, Modernizr and JSCSSP to function. Disabling.");
} else if (!Modernizr.testAllProps('height', 'calc(10px)')) {
	if (typeof String.prototype.startsWith != 'function') {
		String.prototype.startsWith = function (str) {
			return this.indexOf(str) == 0;
		};
	}

	$(document).ready(function () {
		window.PolyCalc = new function () {
			this.abort = false;
			this.pending = false;
			this.requestedInitiating = false;

			this.initiate = function () {
				if (self.pending) {
					self.requestedInitiating = true;
					return;
				}
				self.pending = true;
				var parser = CSSParser;
				var styleSheets = $("style");

				styleSheets.each(function () {
					parseStyleSheet(parser, $(this).html());
				});

				styleSheets = $("link[rel='stylesheet']");
				styleSheets.each(function () {
					$.get($(this).attr("href"), function (data) {
						parseStyleSheet(parser, data);
					});
				});

				// Do not use inline styles if you are building for Internet Explorer!
				$("*").each(function () { // $("[style*='calc(']"); fails for Chrome
					if ($(this).attr("style") === undefined)
						return;

					if ($(this).attr("style").indexOf("calc(") != -1)
						parseInline(parser, $(this));
				});
				self.pending = false;
				if (self.requestedInitiating) {
					this.requestedInitiating = false;
					self.initiate();
				}
			}

			var parseStyleSheet = function (parser, source) {
				var styleSheet = parser(source, false, false);
				var selectors = styleSheet.stylesheet.rules ? styleSheet.stylesheet.rules : [];

				selectorsIteration(selectors);
			}

			var selectorsIteration = function (selectors) {
				for (var i = 0; i < selectors.length; ++i) {
					var selector = selectors[i];

					if (selector.rules) {
						selectorsIteration(selector.rules);
						continue;
					}

					parseSelector(selector, false);
				}
			}

			var parseInline = function (parser, element) {
				var source = "* { " + element.attr("style") + " }";
				var style = parser(source, false, false);

				var properties = style.stylesheet.rules ? (style.stylesheet.rules[0].declarations ? style.stylesheet.rules[0].declarations : []) : [];

				for (var i = 0; i < properties.length; ++i) {
					var property = properties[i];

					parseProperty(element, property, true);
				}
			}

			var parseSelector = function (selector) {
				var properties = selector.declarations ? selector.declarations : [];

				for (var i = 0; i < properties.length; ++i) {
					var property = properties[i];

					parseProperty(selector, property, false);
				}
			}

			var parseProperty = function (selector, value, elementKnown) {
					if (!elementKnown)
						var selectorValue = selector.selectors ? selector.selectors[0] : '';

					var propertyValue = value.property;
					var valueValue = value.value;

					if (valueValue && valueValue.indexOf("calc(") !== -1) {
						if (elementKnown) {
							elements = selector;
						} else {
							elements = $(selectorValue);
						}

						if (!elements.length) {
							return;
						}

						elements.each(function () {
							var newValue = parseExpression(propertyValue, valueValue, $(this)) + "px";
							$(this).css(propertyValue, newValue);
						});
					}
			}

			var parseExpression = function (propertyValue, expression, element) {
				var newExpression = "";
				expression = expression.match(/^calc\((.+)\)$/);

				if (!expression) {
					return;
				}

				expression = expression[1];

				var value = -1;
				for (var i = 0; i < expression.length; ++i) {
					var substr = expression.substring(i);

					var regex = substr.match(/^[\d.]+/);
					if (regex !== null) {
						value = parseFloat(regex[0], 10);

						i += regex[0].length - 1;

						continue;
					}

					regex = substr.match(/^([A-Za-z]+|%)/);
					if (regex !== null) {
						value = convertUnit(regex[1], "px", value, propertyValue, element);
						if (value !== -1)
							newExpression += value;

						i += regex[1].length - 1;
						value = -1;

						continue;
					}

					var char = expression.charAt(i);

					if (char == '+' || char == '-' || char == '*' || char == '/' || char == '(' || char == ')') {
						newExpression += char;
						value = -1;
					}
				}

				return eval(newExpression);
			}

			var convertUnit = function (from, to, value, propertyValue, element) {
				switch (to) {
					case "px": {
						switch (from) {
							case "px":
								return value;
							case "%":
								value *= 0.01;
								value *= parseInt(element.parent().css(propertyValue), 10);
								return value;
							case "em":
								value *= parseInt(element.parent().css("font-size"), 10);
								return value;
							case "rem":
								value *= parseInt($("body").css("font-size"), 10);
								return value;
							case "in":
								value *= 96;
								return value;
							case "pt":
								value *= 4 / 3;
								return value;
							case "pc":
								value *= 16;
								return value;
							case "mm":
								value *= 9.6;
								value /= 2.54
								return value;
							case "cm":
								value *= 96;
								value /= 2.54
								return value;
						}

						break;
					}
				}

				return -1;
			}
		};

		$(window).resize(PolyCalc.initiate);
		PolyCalc.initiate();
	});
}
