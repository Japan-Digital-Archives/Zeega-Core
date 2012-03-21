(function(Layer){

	Layer.Views.Lib = Backbone.View.extend({
		initialize : function( args )
		{
			this.settings = _.defaults( args, this.defaults );
			this.init();
		},
		init : function(){},
		getControl : function()
		{
			this.render();
			return this.el;
		}
	});

	Layer.Views.Lib.Target = Layer.Views.Lib.extend({
		
		defaults : {
			className : '',
			idName : ''
		},
		
		init : function( args )
		{
			this.className = this.settings.className;
		},
		
		render : function()
		{
			$(this.el).attr('id', this.settings.idName);
		}
		
	});



	Layer.Views.Lib.Slider = Layer.Views.Lib.extend({
		
		className : 'control control-slider',
		
		defaults : {
			label : 'control',
			min : 0,
			max : 100,
			step : 1,
			value : 100,
			silent : false,
			suffix : '',
			css : true,
			scaleWith : false,
			scaleValue : false,
			callback : false,
			save : true
		},
		
		render : function()
		{
			var _this = this;
			
			this.$el.append( _.template( this.getTemplate(), this.settings ));
			
			//slider stuff here
			this.$el.find('.control-slider').slider({
				min : this.settings.min,
				max : this.settings.max,
				value : this.model.get('attr')[this.settings.property] || this.settings.value,
				step : this.settings.step,
				slide : function(e, ui)
				{
					if( _this.settings.css )
						_this.model.visual.$el.css( _this.settings.property, ui.value + _this.settings.suffix );
				},
				stop : function(e,ui)
				{
					if(_this.settings.save)
					{
						var attr = {};
						attr[_this.settings.property] = ui.value;
						_this.model.update( attr )
					}
				}
			});
			
			return this;
		},
		
		getTemplate : function()
		{
			var html = ''+
			
					"<div class='control-name'><%= label %></div>"+
					"<div class='control-slider'></div>";
			
			return html;
		}
	});
	
	
	Layer.Views.Lib.ColorPicker = Layer.Views.Lib.extend({
		
		className : 'control control-colorpicker',
		
		defaults : {
			property : 'backgroundColor',
			color : '#ffffff',
			save : 'true'
		},
		
		
		save : function()
		{
			console.log('save rect')
			var attr = {};
			console.log(this)
			attr[ this.settings.property ] = this.settings.color;
			this.model.update( attr )
		},
		
		render : function()
		{
			var _this = this;
			
			
			
			this.$el.append( _.template( this.getTemplate(), this.settings ));
			
			$.farbtastic(this.$el.find('.control-colorpicker'))
				.setColor( _this.settings.color )
				.linkTo(function(color){
					console.log(color)
					_this.model.visual.$el.css( _this.settings.property, color );
					_this.settings.color = color;
					if(_this.settings.save) _this.lazySave();
				});
			
			return this;
		},
		
		lazySave : _.debounce( function(){
			var attr = {};
			attr[ this.settings.property ] = this.settings.color;
			this.model.update( attr );
		}, 3000),
		
		getTemplate : function()
		{
			var html = ''+
			
					"<div class='control-name'><%= label %></div>"+
					"<div class='control-colorpicker'></div>";
			
			return html;
		}
	});


	// depends on popcorn.js
	Layer.Views.Lib.Playback = Layer.Views.Lib.extend({
		
		className : 'control control-playback plyr-controls-wrapper',
		
		defaults : {},
		
		init : function()
		{
			this.model.on('video_ready', this.onVideoReady, this);
		},
		
		render : function()
		{
			var _this = this;
			
			this.$el.append( this.getTemplate() ).attr('id','plyr-editor');
			
			return this;
		},
		
		onVideoReady : function()
		{
			this.delegateEvents();
			this.initPopcornEvents();
			this.initScrubbers();
		},
		
		initPopcornEvents : function()
		{
			var _this = this;
			
			console.log(this.model.video)
			
			this.model.video.pop.listen('pause',function(){
				_this.$el.find('.plyr-button').removeClass('plyr-pause').addClass('plyr-play');
			});
			
			this.model.video.pop.listen('play',function(){
				_this.$el.find('.plyr-button').removeClass('plyr-play').addClass('plyr-pause');
			});
			
			this.model.video.pop.listen('timeupdate', function(){

				if(_this.model.video.pop.currentTime() > _this.model.get('attr').cue_out )
				{
					_this.model.video.pop.pause();
					_this.model.video.pop.currentTime( _this.model.get('attr').cue_in );
				}
				
				var left = parseFloat( _this.model.video.pop.currentTime()) / parseFloat( _this.model.video.pop.duration() ) * 100;
				_this.$el.find('.plyr-scrubber').css({ 'left' : left+'%' });
				_this.$el.find('.plyr-time').html( convertTime( _this.model.video.pop.currentTime() )+' / '+convertTime( _this.model.video.pop.duration() ) );
				_this.$el.find('.plyr-time-bar').css({ 'width' : left+'%' });

			});
			
			this.model.video.pop.listen('seeking',function(){});
			this.model.video.pop.listen('seeked',function(){});
			this.model.video.pop.listen('ended',function(){
				//this.currentTime(0);
			});
			this.model.video.pop.listen('loadeddata',function(){});
		},
		
		initScrubbers : function()
		{
			var _this = this;
			this.$el.find('.plyr-scrubber').draggable({
				
				axis:'x',
				containment: 'parent',
				
				start:function()
				{
					_this.model.video.pop.pause();
				},
				
				drag:function(event, ui)
				{
					var newTime = Math.floor(parseFloat(ui.position.left)*_this.model.video.pop.duration()/parseFloat(_this.$el.find('.plyr-timeline').width()));	
					_this.$el.find('.plyr-time').html( convertTime(newTime)+' / '+convertTime(_this.model.video.pop.duration()));
				},
				
				stop: function(event, ui)
				{
					var newTime = Math.floor(parseFloat(_this.$el.find('.plyr-scrubber').css('left'))*_this.model.video.pop.duration()/parseFloat(_this.$el.find('.plyr-timeline').width()));
					if( newTime < _this.model.get('attr').cue_in ) newTime = _this.model.get('attr').cue_in;
					else if( newTime > _this.model.get('attr').cue_out) newTime = Math.max(parseFloat(_this.model.get('attr').cue_in), parseFloat(_this.model.get('attr').cue_out)-5.0);
				
					_this.model.video.pop.trigger('timeupdate');
					_this.model.video.pop.currentTime( newTime );
					
					//_this.pop.play();
				}
			});
			
			this.$el.find('.plyr-cuein-scrubber').draggable({
				axis:'x',
				containment: 'parent',
				
				drag:function(event, ui)
				{
					_this.model.get('attr').cue_in = Math.floor( parseFloat(ui.position.left)*_this.model.video.pop.duration()/parseFloat(_this.$el.find('.plyr-timeline').width()));	
					_this.$el.find('.plyr-cuein-time').html( convertTime(_this.model.get('attr').cue_in,true) );
				},
				
				stop: function(event, ui)
				{
					
					_this.$el.find('.plyr-cuein-bar').css({'width':_this.$el.find('.plyr-cuein-scrubber').css('left')});
					_this.model.video.pop.currentTime( Math.floor(parseFloat(ui.position.left) * _this.model.video.pop.duration() / parseFloat(_this.$el.find('.plyr-timeline').width())));

					var left = parseFloat( _this.model.video.pop.currentTime() ) / parseFloat( _this.model.video.pop.duration() ) * 100;
					_this.$el.find('.plyr-scrubber').css({'left':left+'%'});
					_this.$el.find('.plyr-time').html(convertTime(_this.model.video.pop.currentTime())+' / '+convertTime(_this.model.video.pop.duration()));
					_this.$el.find('.plyr-time-bar').css({'width':left+'%'});
					
					_this.model.update({'cue_in' : _this.model.video.pop.currentTime() })
				}
			});
			
			this.$el.find('.plyr-cueout-scrubber').draggable({
				axis:'x',
				containment: 'parent',
				
				start:function()
				{
					_this.model.video.pop.pause();
				},
				
				drag:function(event, ui)
				{
					_this.model.get('attr').cue_out = Math.floor(parseFloat(ui.position.left)*_this.model.video.pop.duration() / parseFloat( _this.$el.find('.plyr-timeline').width()));	
					_this.$el.find('.plyr-cueout-time').html(convertTime( _this.model.get('attr').cue_out,true));
				},
				
				stop: function(event, ui)
				{
					_this.$el.find('.plyr-cueout-bar').css({'width':parseInt(_this.$el.find('.plyr-timeline').width())-parseInt(_this.$el.find('.plyr-cueout-scrubber').css('left'))});
					_this.model.video.pop.currentTime(Math.max(parseFloat(_this.model.get('attr').cue_in), parseFloat(_this.model.get('attr').cue_out)-5.0));
				
					_this.model.update({'cue_out' : _this.model.video.pop.currentTime() })
				}
			});
		},
		
		events : {
			
			'click .plyr-button' : 'playPause'
			
		},
		
		playPause : function()
		{
			console.log( 'volume: '+ this.model.get('attr').volume )
			this.model.video.pop.volume( this.model.get('attr').volume );
			if ( this.model.video.pop.paused() ) this.model.video.pop.play();
			else this.model.video.pop.pause();
		},
		
		getTemplate : function()
		{
			var html = 
			
			'<div class="plyr-time-wrapper">'+
				'<div class="plyr-cuein-time"></div>'+
				'<div class="plyr-cueout-time"></div>'+
			'</div>'+
			'<div class="plyr-timeline-wrapper">'+
				'<div class="plyr-button-wrapper">'+
					'<div class="plyr-button plyr-play"></div>'+
				'</div>'+
				'<div class="plyr-timeline">'+
					'<div class="plyr-cuein-bar plyr-bar"></div>'+
					'<div class="plyr-time-bar plyr-bar"></div>'+
					'<div class="plyr-cueout-bar plyr-bar"></div>'+
					'<div class="plyr-cuein-scrubber plyr-edit-scrubber">'+
						'<div class="plyr-scrubber-select"></div>'+
						'<div class="plyr-arrow-down-green"></div>'+
					'</div>'+
					'<div class="plyr-scrubber plyr-edit-scrubber">'+
						'<div class="plyr-hanging-box"></div>'+
					'</div>'+
					'<div class="plyr-cueout-scrubber plyr-edit-scrubber">'+
						'<div class="plyr-scrubber-select"></div>'+
						'<div class="plyr-arrow-down"></div>'+
					'</div>'+
				'</div>'+
			'</div>'+
			'<div class="plyr-time-wrapper">'+
				'<span class="plyr-time"></span>'+
			'</div>';
			
			return html;
		}
	});
	
})(zeega.module("layer"));
