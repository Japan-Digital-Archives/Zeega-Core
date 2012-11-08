this.zeega = this.zeega|| {};

this.zeega.dashboard = {
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

	init : function()
	{
		var _this = this;

		var Dashboard = zeega.dashboard.module("dashboard");
		
		String.prototype.shorten=function(max_length){
			if(this.length>max_length){
				return this.substr(0,max_length-3)+"...";
			}
			else return this;
		};
		
		
		
		$('.community').click(function(){
			$('.projects').removeClass('active');
			$('.community').addClass('active');
			$('#community-content').show();
			$('#projects-content').hide();
			
		});
		
		$('.projects').click(function(){
			$('.projects').addClass('active');
			$('.community').removeClass('active');
			$('#projects-content').show();
			$('#community-content').hide();
		
		});
		
		
		
		
		
		
		
		this.editable = $.parseJSON(userProjectsJSON).editable;

		zeega.url_prefix = sessionStorage.getItem('hostname') + sessionStorage.getItem('directory');
		
		//Load user info from JSON variable in page
		var user = new Dashboard.Users.Model($.parseJSON(userProjectsJSON));
		this.profilePage = new Dashboard.Users.Views.ProfilePage({model:user}).render();

		var projects = new Dashboard.Project.Collection($.parseJSON(userProjectsJSON).projects);
		this.projectsView = new Dashboard.Project.CollectionView({collection:projects}).render();

		var items = new Dashboard.Items.Collection({type:'unmoderated'});
		items.fetch({success:function(collection,response){
		
			_this.moderationView = new Dashboard.Items.CollectionView({collection:collection});
			$('#community-content').append(_this.moderationView.render().el);
			
		}});
		
	},
	
	
		
	

	}, Backbone.Events)


};