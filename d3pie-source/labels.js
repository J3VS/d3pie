// --------- labels.js -----------
d3pie.labels = {

	outerGroupTranslateX: [],
	outerGroupTranslateY: [],
	lineCoordGroups: [],

	/**
	 * Adds the labels to the pie chart, but doesn't position them. There are two locations for the
	 * labels: inside (center) of the segments, or outside the segments on the edge.
	 * @param section "inner" or "outer"
	 * @param sectionDisplayType "percentage", "value", "label", "label-value1", etc.
	 */
	add: function(section, sectionDisplayType) {
		var include = d3pie.labels.getIncludes(sectionDisplayType);
		var settings = _options.labels;

		// group the label groups (label, percentage, value) into a single element for simpler positioning
		var outerLabel = _svg.insert("g", ".labels-" + section)
			.attr("class", "labels-" + section);

		var labelGroup = outerLabel.selectAll(".labelGroup-" + section)
			.data(
				_options.data.filter(function(d) { return d.value; }),
				function(d) { return d.label; }
			)
			.enter()
			.append("g")
			.attr("class", "labelGroup-" + section)
			.attr("id", function(d, i) { return "labelGroup" + i + "-" + section; })
			.style("opacity", 0);

		// 1. Add the main label
		if (include.mainLabel) {
			labelGroup.append("text")
				.attr("class", "segmentMainLabel-" + section)
				.attr("id", function(d, i) { return "segmentMainLabel" + i + "-" + section; })
				.text(function(d) { return d.label; })
				.style("font-size", settings.mainLabel.fontSize)
				.style("font-family", settings.mainLabel.font)
				.style("fill", settings.mainLabel.color);
		}

		// 2. Add the percentage label
		if (include.percentage) {
			labelGroup.append("text")
				.attr("class", "segmentPercentage-" + section)
				.attr("id", function(d, i) { return "segmentPercentage" + i + "-" + section; })
				.text(function(d) {
					return parseInt((d.value / _totalSize) * 100).toFixed(0) + "%"; // TODO
				})
				.style("font-size", settings.percentage.fontSize)
				.style("font-family", settings.percentage.font)
				.style("fill", settings.percentage.color);
		}

		// 3. Add the value label
		if (include.value) {
			labelGroup.append("text")
				.attr("class", "segmentValue-" + section)
				.attr("id", function(d, i) { return "segmentValue" + i + "-" + section; })
				.text(function(d) { return d.value; })
				.style("font-size", settings.value.fontSize)
				.style("font-family", settings.value.font)
				.style("fill", settings.value.color);
		}
	},

	/**
	 * @param section "inner" / "outer"
	 */
	positionLabelElements: function(section, sectionDisplayType) {
		d3pie.labels["dimensions-" + section] = [];

		// get the latest widths, heights
		var labelGroups = $(".labelGroup-" + section);

		for (var i=0; i<labelGroups.length; i++) {
			var mainLabel = $(labelGroups[i]).find(".segmentMainLabel-" + section);
			var percentage = $(labelGroups[i]).find(".segmentPercentage-" + section);
			var value = $(labelGroups[i]).find(".segmentValue-" + section);

			d3pie.labels["dimensions-" + section].push({
				mainLabel: (mainLabel.length > 0) ? mainLabel[0].getBBox() : null,
				percentage: (percentage.length > 0) ? percentage[0].getBBox() : null,
				value: (value.length > 0) ? value[0].getBBox() : null
			});
		}

		var singleLinePad = 5;
		var dims = d3pie.labels["dimensions-" + section];
		switch (sectionDisplayType) {
			case "label-value1":
				d3.selectAll(".segmentValue-outer")
					.attr("dx", function(d, i) { return dims[i].mainLabel.width + singleLinePad; });
				break;
			case "label-value2":
				d3.selectAll(".segmentValue-outer")
					.attr("dy", function(d, i) { return dims[i].mainLabel.height; });
				break;
			case "label-percentage1":
				d3.selectAll(".segmentPercentage-outer")
					.attr("dx", function(d, i) { return dims[i].mainLabel.width + singleLinePad; });
				break;
			case "label-percentage2":
				d3.selectAll(".segmentPercentage-outer")
					.attr("dx", function(d, i) { return (dims[i].mainLabel.width / 2) - (dims[i].percentage.width / 2); })
					.attr("dy", function(d, i) { return dims[i].mainLabel.height; });
				break;
	 	}
	},

	computeOuterCoords: function() {
		d3pie.labels.lineCoordGroups = []; // probably need one for inner + outer, correct?

		d3.selectAll(".labelGroup-outer")
			.each(function(d, i) { return d3pie.labels.getLabelGroupTransform(d, i); });
	},

	addLabelLines: function() {
		var lineGroups = _svg.insert("g", ".pieChart") // meaning, BEFORE .pieChart
			.attr("class", "lineGroups")
			.style("opacity", 0);

		var lineGroup = lineGroups.selectAll(".lineGroup")
			.data(d3pie.labels.lineCoordGroups)
			.enter()
			.append("g")
			.attr("class", "lineGroup")
			.attr("transform", d3pie.math.getPieTranslateCenter);

		var lineFunction = d3.svg.line()
			.interpolate("basis")
			.x(function(d) { return d.x; })
			.y(function(d) { return d.y; });

		lineGroup.append("path")
			.attr("d", lineFunction)
			.attr("stroke", function(d, i) {
				var color;
				if (_options.labels.lines.color === "segment") {
					color = _options.styles.colors[i];
				} else {
					color = _options.labels.lines.color;
				}
				return color;
			})
			.attr("stroke-width", 1)
			.attr("fill", "none");
	},

	positionLabelGroups: function(section) {

		d3.selectAll(".labelGroup-" + section)
			.style("opacity", 0)
			.attr("transform", function(d, i) {
				var x, y;
				if (section === "outer") {
					x = d3pie.labels.outerGroupTranslateX[i];
					y = d3pie.labels.outerGroupTranslateY[i];

				} else {
					var center = d3pie.segments.getCentroid(document.getElementById("segment" + i));

					//console.log(i, _options.data, _totalSize);
					var rotationAngle = d3pie.math.getSegmentRotationAngle(i, _options.data, _totalSize);

//					var center = d3pie.math.getPieCenter();
					var diff = (_outerRadius - _innerRadius) / 2;

					x = (d3pie.labels.lineCoordGroups[i][0].x / 2) + center.x;
					y = (d3pie.labels.lineCoordGroups[i][0].y / 2) + center.y;
				}

				return "translate(" + x + "," + y + ")";
			});

		// now for some basic collision handling
		d3pie.labels.resolveLabelCollisions(section);
	},


	resolveOuterLabelCollisions: function() {
		if (section === "inner") {
			return;
		}

		var labels = d3.selectAll(".labelGroup-" + section)[0];

		var x, y;
		for (var i=1; i<labels.length; i++) {
			console.log($(labels[i]).attr("transform"));
		}
	},


	fadeInLabelsAndLines: function() {

		// fade in the labels when the load effect is complete - or immediately if there's no load effect
		var loadSpeed = (_options.effects.load.effect === "default") ? _options.effects.load.speed : 1;
		setTimeout(function() {
			var labelFadeInTime = (_options.effects.load.effect === "default") ? _options.effects.labelFadeInTime : 1;

			d3.selectAll(".labelGroup-outer,.labelGroup-inner")
				.transition()
				.duration(labelFadeInTime)
				.style("opacity", 1);

			d3.selectAll("g.lineGroups")
				.transition()
				.duration(labelFadeInTime)
				.style("opacity", 1);

			// once everything's done loading, trigger the onload callback if defined
			if ($.isFunction(_options.callbacks.onload)) {
				setTimeout(function() {
					try {
						_options.callbacks.onload();
					} catch (e) { }
				}, labelFadeInTime);
			}
		}, loadSpeed);
	},

	getIncludes: function(val) {
		var addMainLabel  = false;
		var addValue      = false;
		var addPercentage = false;
		switch (val) {
			case "label":
				addMainLabel = true;
				break;
			case "value":
				addValue = true;
				break;
			case "percentage":
				addPercentage = true;
				break;
			case "label-value1":
			case "label-value2":
				addMainLabel = true;
				addValue = true;
				break;
			case "label-percentage1":
			case "label-percentage2":
				addMainLabel = true;
				addPercentage = true;
				break;
		}
		return {
			mainLabel: addMainLabel,
			value: addValue,
			percentage: addPercentage
		};
	},


	getLabelGroupTransform: function(d, i) {

		var labelDimensions = document.getElementById("labelGroup" + i + "-outer").getBBox();

		var lineLength = _options.labels.lines.length;
		var lineMidPointDistance = lineLength - (lineLength / 4);
		var angle = d3pie.math.getSegmentRotationAngle(i, _options.data, _totalSize);

		var nextAngle = 360;
		if (i < _options.data.length - 1) {
			nextAngle = d3pie.math.getSegmentRotationAngle(i+1, _options.data, _totalSize);
		}

		var segmentCenterAngle = angle + ((nextAngle - angle) / 2);
		var remainderAngle = segmentCenterAngle % 90;
		var quarter = Math.floor(segmentCenterAngle / 90);


		var labelXMargin = 10; // the x-distance of the label from the end of the line [TODO configurable?]
		var xOffset = (_options.data[i].xOffset) ? _options.data[i].xOffset : 0;
		var heightOffset = labelDimensions.height / 5;
		var yOffset = (_options.data[i].yOffset) ? _options.data[i].yOffset : 0;
		var center = d3pie.math.getPieCenter();

		/*
		x1 / y1: the x/y coords of the start of the line, at the mid point of the segments arc on the pie circumference
	    x2 / y2: the midpoint of the line
		x3 / y3: the end of the line; closest point to the label
		groupX / groupX: the coords of the label group
		*/

		var x1, x2, x3, groupX, y1, y2, y3, groupY, outerGroupX, outerGroupY;
		switch (quarter) {
			case 0:
				var xCalc1 = Math.sin(d3pie.math.toRadians(remainderAngle));
				groupX = xCalc1 * (_outerRadius + lineLength) + labelXMargin;
				x1     = xCalc1 * _outerRadius;
				x2     = xCalc1 * (_outerRadius + lineMidPointDistance);
				x3     = xCalc1 * (_outerRadius + lineLength) + 5 + xOffset; // TODO what's this mysterious "5"?

				var yCalc1 = Math.cos(d3pie.math.toRadians(remainderAngle));
				groupY = -yCalc1 * (_outerRadius + lineLength);
				y1     = -yCalc1 * _outerRadius;
				y2     = -yCalc1 * (_outerRadius + lineMidPointDistance) + yOffset;
				y3     = -yCalc1 * (_outerRadius + lineLength) - heightOffset + yOffset;
				break;

			case 1:
				var xCalc2 = Math.cos(d3pie.math.toRadians(remainderAngle));
				groupX = xCalc2 * (_outerRadius + lineLength) + labelXMargin;
				x1     = xCalc2 * _outerRadius;
				x2     = xCalc2 * (_outerRadius + lineMidPointDistance);
				x3     = xCalc2 * (_outerRadius + lineLength) + 5 + xOffset;

				var yCalc2 = Math.sin(d3pie.math.toRadians(remainderAngle));
				groupY = yCalc2 * (_outerRadius + lineLength);
				y1     = yCalc2 * _outerRadius;
				y2     = yCalc2 * (_outerRadius + lineMidPointDistance) + yOffset;
				y3     = yCalc2 * (_outerRadius + lineLength) - heightOffset + yOffset;
				break;

			case 2:
				var xCalc3 = Math.sin(d3pie.math.toRadians(remainderAngle));
				groupX = -xCalc3 * (_outerRadius + lineLength) - labelDimensions.width - labelXMargin;
				x1     = -xCalc3 * _outerRadius;
				x2     = -xCalc3 * (_outerRadius + lineMidPointDistance);
				x3     = -xCalc3 * (_outerRadius + lineLength) - 5 + xOffset;

				var yCalc3 = Math.cos(d3pie.math.toRadians(remainderAngle));
				groupY = yCalc3 * (_outerRadius + lineLength);
				y1     = yCalc3 * _outerRadius;
				y2     = yCalc3 * (_outerRadius + lineMidPointDistance) + yOffset;
				y3     = yCalc3 * (_outerRadius + lineLength) - heightOffset + yOffset;
				break;

			case 3:
				var xCalc4 = Math.cos(d3pie.math.toRadians(remainderAngle));
				groupX = -xCalc4 * (_outerRadius + lineLength) - labelDimensions.width - labelXMargin;
				x1     = -xCalc4 * _outerRadius;
				x2     = -xCalc4 * (_outerRadius + lineMidPointDistance);

				x3 = -xCalc4 * (_outerRadius + lineLength) - 5 + xOffset;

				var calc4 = Math.sin(d3pie.math.toRadians(remainderAngle));
				groupY = -calc4 * (_outerRadius + lineLength);
				y1     = -calc4 * _outerRadius;
				y2     = -calc4 * (_outerRadius + lineMidPointDistance) + yOffset;
				y3 = -calc4 * (_outerRadius + lineLength) - heightOffset + yOffset;
				break;
		}

		d3pie.labels.lineCoordGroups[i] = [
			{ x: x1, y: y1 },
			{ x: x2, y: y2 },
			{ x: x3, y: y3 }
		];

		d3pie.labels.outerGroupTranslateX[i] = groupX + xOffset + center.x;
		d3pie.labels.outerGroupTranslateY[i] = groupY + yOffset + center.y;
	},

	// -----------------------------------------

	funWithForces: function() {

		var nodes = d3.selectAll(".segmentMainLabel-outer");
		var force = d3.layout.force()
			.gravity(0.05)
			.charge(function(d, i) { return i ? 0 : -2000; })
			.nodes(nodes)
			.size([_options.size.canvasWidth, _options.size.canvasHeight]);

//			var root = nodes[0];
//			root.radius = 0;
//			root.fixed = true;

		force.start();

		var center = d3pie.math.getPieCenter();
		force.on("tick", function(e) {
			var q = d3.geom.quadtree(nodes);
			var i = 0;
			var n = nodes.length;

			while (++i < n) {
				q.visit(d3pie.labels.preventCollisions(nodes[i]));
			}

			_svg.selectAll(".segmentMainLabel-outer")
				.attr("transform", function(d, i) {
//					console.log("row: ", arguments);
//					return "translate(" + (d.x + center.x) + "," + (d.y + center.y) +  + ")";
				});
		});
	},

	preventCollisions: function(node) {
		var r = node.radius + 16,
			nx1 = node.x - r,
			nx2 = node.x + r,
			ny1 = node.y - r,
			ny2 = node.y + r;

		return function(quad, x1, y1, x2, y2) {
			if (quad.point && (quad.point !== node)) {
				var x = node.x - quad.point.x,
					y = node.y - quad.point.y,
					l = Math.sqrt(x * x + y * y),
					r = node.radius + quad.point.radius;
				if (l < r) {
					l = (l - r) / l * .5;
					node.x -= x *= l;
					node.y -= y *= l;
					quad.point.x += x;
					quad.point.y += y;
				}
			}
			return x1 > nx2
				|| x2 < nx1
				|| y1 > ny2
				|| y2 < ny1;
		};
	}
};