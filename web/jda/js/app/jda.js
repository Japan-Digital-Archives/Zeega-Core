// This contains the module definition factory function, application state,
// events, and the router.
this.jda = {
	// break up logical components of code into modules.
	module: function()
	{
		// Internal module cache.
		var modules = {};

		// Create a new module reference scaffold or load an existing module.
		return function(name) 
		{
			// If this module has already been created, return it.
			if (modules[name]) return modules[name];

			// Create a module and save it under this name
			return modules[name] = { Views: {} };
		};
	}(),

  // Keep active application instances namespaced under an app object.
  app: _.extend({

	apiLocation : 'http://dev.zeega.org/jdaapi/web/',
	currentView : 'list',
	mapLoaded : false,
	timeSliderLoaded : false,
	japanMapUrl : "http://worldmap.harvard.edu/geoserver/",
	geoUrl : "http://geo.zeega.org/geoserver/",
	
	init : function()
	{
		// Include all modules

		var Items = jda.module("items");
		
		// make item collection
		this.itemViewCollection = new Items.ViewCollection();
	},
	

	search : function(obj)
	{
		
		//Parse out search box values for putting them in the Search query
		if (!_.isUndefined(jda.app.visualSearch)){
			

			var facets = jda.app.visualSearch.searchQuery.models;
			
			var tagQuery = "tag:";
			var textQuery = "";

			_.each(facets, function(facet) {
			    switch (facet.get('category')) {
			        case 'text':
			            textQuery = textQuery.length > 0 ? textQuery + " AND " + facet.get('value') : facet.get('value'); 
			        break;
			        case 'tag':
			            tagQuery = tagQuery.length > 4 ? tagQuery + ", " + facet.get('value') : tagQuery + facet.get('value');
			        break;
			        
			    }
			});
			obj.query = textQuery + (textQuery.length > 0 && tagQuery.length > 4 ? " " : "") + (tagQuery.length > 4 ? tagQuery : ""); 
		}
		
		/*if($('#search-bar').find('input[value!="search the archive"]').val() != ""){
			obj.query.push($('#search-bar').find('input[value!="search the archive"]').val());
		}*/
		obj.content = $('#content').val();
		this.itemViewCollection.search(obj);
		if (this.currentView == 'event'){
			cqlFilterString = this.itemViewCollection.getCQLSearchString();
			this.map.layers[1].mergeNewParams({
				'CQL_FILTER' : cqlFilterString
			});	
		}
	},
	
	switchViewTo : function( view )
	{
		if( view != this.currentView )
		{
			$('#'+this.currentView+'-view').hide();
			this.currentView = view;
			$('#'+view+'-view').show();
			switch( this.currentView )
			{
				case 'list':
					this.showListView();
					break;
				case 'event':
					this.showEventView();
					break;
				case 'tag':
					this.showTagView();
					break;
				default:
					console.log('view type not recognized')
			}
		}
	},
	
	showListView : function()
	{
		console.log('switch to List view');

	},
	
	showEventView : function()
	{
		console.log('switch to Event view');
		//For some reason, the map collapses after a search to 0px width
		$("#event-view").width(940);
		var map = this.initWorldMap();
		this.initTimeSlider(map);
		this.initLayerControl();
	},
	
	showTagView : function()
	{
		console.log('switch to Tag view');
		
	},
	
	initLayerControl : function(){
		console.log("Initializing Layer Controls");
		_this=this;

		$("#layer-control").tabs();
		this.layerControlIsOut = true;
		
		$("#layer-control-drawer-tab").click(function(){
			if (_this.layerControlIsOut){
				console.log("retract layer controls");
				$("#layer-control-drawer-arrows").html("&lt;&lt;");
				$("#layer-control-drawer").animate({right : "-=200"}, 400);
			}else{
				console.log("expand layer controls");
				console.log($("#layer-control-drawer-arrows"));
				$("#layer-control-drawer-arrows").html("&gt;&gt;");
				$("#layer-control-drawer").animate({right : "+=200"}, 400);
			}
			_this.layerControlIsOut = !_this.layerControlIsOut;
		})
	},
	
	initTimeSlider : function(map)
	{
	console.log("Initializing Time Slider");
	_this = this;
	if( !this.timesliderLoaded )
		{
			this.timeSliderLoaded = true;
			timeSliderContainer = $("#event-time-slider");
			
			//Put HTML into the div
			timesliderHTML = 
				"<div id='date-time-start' class='date-time-block'>" +
					"<input type='text' name='start-date' id='start-date' value='' class='date-picker'>" + 
					"<input type='text' name='start-time' id='start-time' value='' class='time-picker'>" +
				"</div>" +  
				"<div id='date-time-end' class='date-time-block'>" +
					"<input type='text' name='end-date' id='end-date' value='' class='date-picker'>" +
					"<input type='text' name='end-time' id='end-time' value='' class='time-picker'>" +
				"</div>" +
				"<div id='range-slider'></div>";
			timeSliderContainer.html(timesliderHTML);
			
			//add the jquery-ui date and time pickers and change handlers
			$('#start-time').timepicker({}).change(this.setStartDateTimeSliderHandle);
			$('#end-time').timepicker({}).change(this.setEndDateTimeSliderHandle);
			
			$('#start-date').datepicker({
				onSelect: function() {},
				dateFormat : 'MM d, yy',
				onClose : this.setStartDateTimeSliderHandle
			});

			$('#end-date').datepicker({
				onSelect: function() {},
				dateFormat : 'MM d, yy',
				onClose : this.setEndDateTimeSliderHandle
			});
			
			//Set up the range slider
			//times are seconds since jan 1 1970
			minTime = 1293840000;
			maxTime = 1330095357;
			//maxTime = 1293940000;      //short range for testing hours and minutes
			$("#range-slider").slider({
				range: true, 
			 	min: minTime, 
			 	max: maxTime,
				values: [minTime, maxTime],
			 	slide: function( event, ui ) {
			 		if (ui.values[0]<ui.values[1]){
						_this.setStartDateTimeSliderBubble(ui.values[0]);
						_this.setEndDateTimeSliderBubble(ui.values[1]);
						return true;
					}else{
						return false;
					}
				 },
				 change : function(event, ui){	
					_this.setStartDateTimeSliderBubble(ui.values[0]);
					_this.setEndDateTimeSliderBubble(ui.values[1]);
					_this.updateMapForTimeSlider(ui, map);
				 }
			});
			$("#range-slider").css("margin-left", $("#date-time-start").outerWidth());
			$("#range-slider").css("margin-right", $("#date-time-end").outerWidth());
			
			
			//Set the dateTime pickers to the starting slider condition
			this.setStartDateTimeSliderBubble($( "#range-slider" ).slider( "values", 0 ));
			this.setEndDateTimeSliderBubble($( "#range-slider" ).slider( "values", 1 ));
		}
	},
	
	updateMapForTimeSlider : function(sliderUI, map){
		startDate = new Date(sliderUI.values[0]*1000);
		endDate = new Date(sliderUI.values[1]*1000);
		this.itemViewCollection.setStartAndEndTimes(startDate, endDate);
		
		//Time filter string		
		cqlFilterString = this.itemViewCollection.getCQLSearchString();
		this.map.layers[1].mergeNewParams({
			'CQL_FILTER' : cqlFilterString
		});
	},
	
	setStartDateTimeSliderHandle : function()
	{
		dateMillis = $("#start-date").datepicker('getDate').getTime();
		timeStrings = $("#start-time").val().split(':');
		h = timeStrings[0];
		m = timeStrings[1].split(' ')[0];
		timeMillis = h*60*60*1000 + m*60*1000;
		seconds = (dateMillis + timeMillis)/1000;
		oldValues =  $("#range-slider").slider( "option", "values" );
		$( "#range-slider" ).slider( "option", "values", [seconds, oldValues[1]] );
		jda.app.setStartDateTimeSliderBubble(seconds);
	},
	
	setEndDateTimeSliderHandle : function()
	{
		dateMillis = $("#end-date").datepicker('getDate').getTime();
		timeStrings = $("#end-time").val().split(':');
		h = timeStrings[0];
		m = timeStrings[1].split(' ')[0];
		timeMillis = h*60*60*1000 + m*60*1000;
		seconds = (dateMillis + timeMillis)/1000;
		oldValues =  $("#range-slider").slider( "option", "values" );
		$( "#range-slider" ).slider( "option", "values", [oldValues[0], seconds] );
		jda.app.setEndDateTimeSliderBubble(seconds);
	},
	
	setStartDateTimeSliderBubble : function(val)
	{		
		centerX = $("#range-slider a").first().position()["left"];
		dateTimeWidth = $("#date-time-start").outerWidth();
		$("#date-time-start").css("left", centerX);
		var d = new Date(val*1000);
		$("#start-date").val(d.format('mmmm d, yy'));
		$("#start-time").val(d.format("h:MM tt"));
	},
	
	setEndDateTimeSliderBubble : function(val)
	{
		handleWidth =  $("#range-slider a").last().outerWidth();
		centerX = $("#range-slider a").last().position()["left"];
		dateTimeWidth = $("#date-time-end").width();
		$("#date-time-end").css("left", centerX + dateTimeWidth + handleWidth/2);
		var d = new Date(val*1000);
		$("#end-date").val(d.format('mmmm d, yy'));
		$("#end-time").val(d.format("h:MM tt"));
	},
	
	initWorldMap : function()
	{
		console.log("Initializing Map");
		if( !this.mapLoaded )
		{
			//OpenLayers.IMAGE_RELOAD_ATTEMPTS = 5;
			//OpenLayers.DOTS_PER_INCH = 25.4 / 0.28;
			
			var map = new OpenLayers.Map('event-map');
			var baseLayer = new OpenLayers.Layer.WMS(
				"OpenLayers WMS",
				"http://vmap0.tiles.osgeo.org/wms/vmap0?",
				{ 
					'layers' : 'basic',
				}
			);
			map.addLayer( baseLayer );
			map.setCenter(new OpenLayers.LonLat(140.652466, 38.052417), 9);
			map.addLayers(this.getMapLayers());

			this.startMapListeners( map );
			this.mapLoaded = true;
		}
		this.map = map;
		return map;
	},
	
	startMapListeners : function( map )
	{
		var _this = this;
		map.events.register('click', map, function(e) {
			var params = {
				REQUEST : "GetFeatureInfo",
				EXCEPTIONS : "application/vnd.ogc.se_xml",
				BBOX : map.getExtent().toBBOX(),
				SERVICE : "WMS",
				VERSION : "1.1.1",
				X : e.xy.x,
				Y : e.xy.y,
				INFO_FORMAT : 'text/html',
				QUERY_LAYERS : 'cite:item',
				FEATURE_COUNT : 50,
				Layers : 'cite:item',
				WIDTH : map.size.w,
				HEIGHT : map.size.h,
				// format : format,
				styles : map.layers[0].params.STYLES,
				srs : map.layers[0].params.SRS
			};
			// merge filters
			if (map.layers[0].params.CQL_FILTER != null) params.cql_filter = map.layers[0].params.CQL_FILTER;
			if (map.layers[0].params.FILTER != null) params.filter = map.layers[0].params.FILTER;
			if (map.layers[0].params.FEATUREID) params.featureid = map.layers[0].params.FEATUREID;
			
			OpenLayers.loadURL(_this.geoUrl + "cite/wms", params, _this, _this.onMapClick, _this.onMapClick);
			_this.mapClickEvent = e;
			OpenLayers.Event.stop(e);
		});
		
		$(".layer-checkbox").click(function(){
			_this.toggleMapLayer($(this).attr("id"), map);
			_this.toggleLegendEntry($(this).attr("id"), map);
		});
	},
	
	toggleLegendEntry :  function(checkboxID, map) {
		switch(checkboxID){
			case "municipal-layer":			
				layer = "geonode:Admin_Dissolve_Test2_JOB";
				legendID = "municipal-legend";
				break;
			case "radiation-layer":			
				layer = "geonode:rad_may11_contours_final_cgl";
				legendID = "radiation-legend";
				break;
			case "casualties-layer":			
				layer =  "geonode:Slct_Casualty2010Join1_Final_zDe";
				legendID = "casualties-legend";
				break;
			case "flooding-layer":			
				layer =  "geonode:japan8m_ezt";
				legendID = "flooding-legend";
				break;
			case "shake-layer":
				layer ="geonode:InstruIntensity_Clip_dOd";
				legendID = "shake-legend";
				break;
		}
		
		//If the image hasn't been loaded yet, do so
		if ($("#"+legendID).find("img").length==0){
			legendString = "http://worldmap.harvard.edu/geoserver/wms?TRANSPARENT=TRUE&EXCEPTIONS=application%2Fvnd.ogc.se_xml&VERSION=1.1.1&SERVICE=WMS&REQUEST=GetLegendGraphic&LLBBOX=133.65533295554525,34.24189997810896,143.33901303676075,42.22959346742014&URL=http%3A%2F%2Fworldmap.harvard.edu%2Fgeoserver%2Fwms&TILED=true&TILESORIGIN=14878443.604346,4061329.7164352&LAYER="+layer+"&FORMAT=image/gif&SCALE=1091958.1364361627";
			$("#"+legendID).append("<img src='" + legendString + "'>");
		}		
		//toggle visibility of that legend item
		$("#"+legendID).toggleClass("hidden");

	},
	
	toggleMapLayer : function(checkboxID, map) {
		//map layer names are the same as checkbox id's
		map.getLayersByName(checkboxID)[0].setVisibility($('#'+checkboxID).is(':checked'));
	},
	
	onLegendLoad : function(response){
		console.log(response);
	},
	
	onMapClick : function(response)
	{
		//TODO close existing popups
		//FIXIT clicking on an item in the OpenLayers popup does not open the fancybox
		//TODO error checking on response
		
		var data = eval('(' + response.responseText + ')');
		var Items = jda.module("items");

		var map = this.map;
		features = data["features"];
		features.shift();  //removes first item which is empty
		
		mapPopUpList = new Items.MapPoppupViewCollection({
			collection : new Items.Collection(features)
		});
		popupHTML = $(mapPopUpList.el).html();
		map.addPopup(new OpenLayers.Popup.FramedCloud("map-popup", map.getLonLatFromPixel(this.mapClickEvent.xy), map.size, popupHTML, null, true));
	},
	
	getMapLayers : function()
	{
		_this = this;
		var layers = [];
		
		//Set up the CQL filter for the geoserver based on existing search:
		cqlFilterString = this.itemViewCollection.getCQLSearchString();

		layers.push(new OpenLayers.Layer.WMS(
			"cite:item - tiled",
			this.geoUrl + "cite/wms",
			{
				layers : 'cite:item',
				transparent : true,
				format : 'image/png',
				'CQL_FILTER' : cqlFilterString 
			}
		));
		
		//JapanMap layers.  For more layers, it will make sense to load these only when needed.
		layers.push( new OpenLayers.Layer.WMS(
			"municipal-layer",
			this.japanMapUrl + "wms",
			{
				layers : "geonode:Admin_Dissolve_Test2_JOB",
				format : 'image/png',
				transparent : true,
				tiled : true
			},
			{
				singleTile : false,
				wrapDateLine : true,
				visibility : false,
				opacity : 0.3
			})
		);
			
		layers.push( new OpenLayers.Layer.WMS(
			"radiation-layer",
			this.japanMapUrl + "wms",
			{
				layers : "geonode:rad_may11_contours_final_cgl",
				format : 'image/png',
				transparent : true,
				tiled : true
			},
			{
				singleTile : false,
				wrapDateLine : true,
				visibility : false
			})
		);
		
		layers.push(new OpenLayers.Layer.WMS(
			"casualties-layer",
			this.japanMapUrl + "wms",
			{
				layers : "geonode:Slct_Casualty2010Join1_Final_zDe",
				format : 'image/png',
				transparent : true,
				tiled : true
			},
			{
				singleTile : false,
				wrapDateLine : true,
				visibility : false,
				opacity : 0.5
			})
		);
		
		layers.push( new OpenLayers.Layer.WMS(
			"flooding-layer",
			this.japanMapUrl + "wms",
			{
				layers : "geonode:japan8m_ezt",
				format : 'image/png',
				transparent : true,
				tiled : true
			},
			{
				singleTile : false,
				wrapDateLine : true,
				visibility : false
			})
		);
			
		layers.push( new OpenLayers.Layer.WMS(
			"shake-layer",
			this.japanMapUrl + "wms",
			{
				layers : "geonode:InstruIntensity_Clip_dOd",
				format : 'image/png',
				transparent : true,
				tiled : true
			},
			{
				singleTile : false,
				wrapDateLine : true,
				visibility : false,
				opacity : 0.3
			})
		);
		return layers;
	}
	
}, Backbone.Events)


};
