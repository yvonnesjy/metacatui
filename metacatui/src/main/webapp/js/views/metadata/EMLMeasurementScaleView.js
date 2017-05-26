/* global define */
define(['underscore', 'jquery', 'backbone', 
        'models/DataONEObject',
        'models/metadata/eml211/EMLMeasurementScale',
        'text!templates/metadata/eml-measurement-scale.html',
        'text!templates/metadata/nonNumericDomain.html',
        'text!templates/metadata/textDomain.html'], 
    function(_, $, Backbone, DataONEObject, EMLMeasurementScale, 
    		EMLMeasurementScaleTemplate, NonNumericDomainTemplate, TextDomainTemplate){
        
        /* 
            An EMLMeasurementScaleView displays the info about 
            one the measurement scale or category of an eml attribute
        */
        var EMLMeasurementScaleView = Backbone.View.extend({
                   	
            tagName: "div",
            
            className: "eml-measurement-scale",
            
            id: null,
            
            /* The HTML template for a measurement scale */
            template: _.template(EMLMeasurementScaleTemplate),
            nonNumericDomainTemplate: _.template(NonNumericDomainTemplate),
            textDomainTemplate: _.template(TextDomainTemplate),
            
            /* Events this view listens to */
            events: {
            	"click  .category"        : "switchCategory",
            	"change .datetime-string" : "toggleCustomDateTimeFormat",
            	"change .possible-text"   : "toggleNonNumericDomain",
            	"keyup  .new .codelist"   : "addNewCodeRow"
            },
            
            initialize: function(options){
            	if(!options)
            		var options = {};
            	
            	this.isNew = (options.isNew === true) ? true : this.model? false : true;
            	this.model = options.model || EMLMeasurementScale.getInstance();
            },
            
            render: function(){
            	            	
            	//Render the template
            	var viewHTML = this.template(this.model.toJSON());
            	
            	if(this.isNew)
            		this.$el.addClass("new");
            	
            	//Insert the template HTML
            	this.$el.html(viewHTML);
            	
            	//Render any nonNumericDomain models
        		this.$(".non-numeric-domain").append( this.nonNumericDomainTemplate(this.model.get("nonNumericDomain")) );
        		
        		//Render the text domain choices and details
        		this.$(".text-domain").html( this.textDomainTemplate() );
        		
        		//If this attribute is already defined as nonNumericDomain, then fill in the metadata
        		_.each(this.model.get("nonNumericDomain"), function(domain){
            		
        			var nominalTextDomain = this.$(".nominal-options .text-domain"),
        				ordinalTextDomain = this.$(".ordinal-options .text-domain");
        			
        			if(domain.textDomain){
            			if(this.model.get("measurementScale") == "nominal"){
            				nominalTextDomain.html( this.textDomainTemplate(domain.textDomain) );
            			}
            			else{
            				ordinalTextDomain.html( this.textDomainTemplate(domain.textDomain) );
            			}
            			
            			//Add the new code rows in the code list table
            			this.addCodeRow("nominal");
            			this.addCodeRow("ordinal");
            			
            		}
        			else if(domain.enumeratedDomain){
        				this.renderCodeList(domain.enumeratedDomain);
        			}
        			
        		}, this);        			

            },
            
            /* 
             * Rendering functions to only be performed after the 
             * attribute section is fully expanded by the user
             */
            postRender: function(){
            	//Change the category to the 
            	this.setCategory();
            	
            	this.renderUnitDropdown();
            	
            	this.chooseDateTimeFormat();
            	
            	this.chooseNonNumericDomain();
            	
            },
            
            /*
             * Render the table of code definitions from the enumeratedDomain node of the EML
             */
            renderCodeList: function(codeList){
            	
            	var scaleType  = this.model.get("measurementScale"),
            		$container = this.$("." + scaleType + "-options .enumeratedDomain.non-numeric-domain-type .table");
            	
            	_.each(codeList.codeDefinition, function(definition){
            		var row = $(document.createElement("tr"))
            					.addClass("code-row")
            					.append(
            					$(document.createElement("td")).addClass("span2").append( 
            							$(document.createElement("input"))
            								.addClass("full-width codelist code")
            								.attr("type", "text")
            								.attr("data-category", "code")
            								.attr("placeholder", "Code value allowed (e.g. \"site A\")")
            								.val(definition.code) ),
								$(document.createElement("td")).addClass("span10").append( 
            							$(document.createElement("input"))
            								.addClass("full-width codelist definition")
            								.attr("type", "text")
            								.attr("data-category", "codeDefinition")
            								.attr("placeholder", "Definition of this code")
            								.val(definition.definition) )
            				  );
            		
            		//Add the row to the table
            		$container.append(row);
            	});
            	
            	this.addCodeRow();
            	
            },
                        
            updateModel: function(e){
            	if(!e) return;
            	
            	var newValue = $(e.target).val(),
            		category  = $(e.target).attr("data-category"),
            		currentValue = this.model.get(category);
            	
            	if(Array.isArray(currentValue)){
            		var index = this.$(".input[data-category='" + category + "']").index(e.target);
            		
            		currentValue.split(index, 0, newValue);
            		this.model.trigger("change:" + category);
            	}
            	else{
            		this.model.set(category, newValue);
            	}
            },
            
            showValidation: function(){
            	
            	var view = this;
            	
            	setTimeout(function(){
					//If the user focused on another element in this view, don't do anything
					if( _.contains($(document.activeElement).parents(), view.el) )
						return;
					
					//Reset the error messages and styling
					view.$el.removeClass("error");
					view.$(".error").removeClass("error");
					view.$(".notification").text("");
	        		
	            	if(!view.model.isValid()){
	            		var errors = view.model.validationError;
	            		
	            		_.each(Object.keys(errors), function(attr){
	            			view.$(".input[data-category='" + attr + "']").addClass("error");
	            			view.$("[data-category='" + attr + "'] .notification").text(errors[attr]).addClass("error");
	            			
	            		}, view);
	            		
	            		view.$el.addClass("error");
	            	}
					
					
            	}, 200);


            },
            
            setCategory: function(){
            	this.$(".category[value='" + this.model.get("measurementScale") + "']").prop("checked", true);
        		this.switchCategory();
            },
            
            switchCategory: function(){
            	//Switch the category in the view
            	var newCategory = this.$("input[name='measurementScale']:checked").val();
            	
            	this.$(".options").hide();
            	this.$("." + newCategory + "-options.options").show();
            
            	//Switch the model type, if needed
            	var thisCategory = this.model.get("measurementScale");
            	if(thisCategory != newCategory){
            		var newModel;
            		            		
            		if(typeof this.modelCache != "object"){
            			this.modelCache = {};
            		}
            		
            		//Get the model type from this view's cache
            		if(this.modelCache[thisCategory])
            			newModel = this.modelCache[thisCategory];
            		//Get a new model instance based on the type
            		else
            			newModel = EMLMeasurementScale.getInstance(newCategory);
            		
            		//save this model for later in case the user switches back
            		this.modelCache[thisCategory] = this.model;
            		
            		//save the new model
            		this.model = newModel;
            	}
            
            },
            
            renderUnitDropdown: function(){
            	if(this.$("select.units").length) return;
            	
            	//Create a dropdown menu
            	var select = $(document.createElement("select"))
            					.addClass("units full-width")
            					.attr("data-category", "standardUnit"),
            		eml    = this.model.get("parentModel"),
            		i 	   = 0;
            	
            	//Find the EML model
            	while(eml.type != "EML" && i<6){
            		eml = eml.get("parentModel");
            		i++;
            	}
            	
            	//Get the units collection or wait until it has been fetched
            	var units = eml.get("units");
            	if(!units.length){
            		this.listenTo(units, "sync", this.createUnitDropdown);
            		return;
            	}
            	
            	//Create a default option
            	var defaultOption = $(document.createElement("option"))
										.text("Choose a standard unit");
				select.append(defaultOption);
				
            	//Create each unit option in the unit dropdown
            	units.each(function(unit){
            		var option = $(document.createElement("option"))
            						.val(unit.get("_name"))
            						.text(unit.get("_name").charAt(0).toUpperCase() + 
            								unit.get("_name").slice(1) + 
            								" (" + unit.get("description") + ")")
            						.data({ model: unit });
            		select.append(option);
            	}, this);
            	
            	//Add the dropdown to the page
            	this.$(".units-container").append(select);
            	
            	//Select the unit from the EML, if there is one
            	var currentUnit = this.model.get("unit");
            	if(currentUnit && currentUnit.standardUnit){
            		
            		//Get the dropdown for this measurement scale
            		var currentDropdown = this.$("." + this.model.get("measurementScale") + "-options select");
 
            		//Select the unit from the EML
            		currentDropdown.val(currentUnit.standardUnit);
            	}
            },
            
            /*
             *  Chooses the date-time format from the dropdown menu
             */
            chooseDateTimeFormat: function(){
            	if(this.model.type == "EMLDateTimeDomain"){
                	var formatString = this.model.get("formatString");
                	
                	var matchingOption = this.$("select.datetime-string[value='" + formatString + "']");
                	
                	if(matchingOption.length){
                		this.$("select.datetime-string").val(formatString);
                		this.$(".datetime-string-custom-container").hide();
                	}
                	else{
                		this.$("select.datetime-string").val("custom");
                		this.$(".datetime-string-custom").val(formatString);
                		this.$(".datetime-string-custom-container").show();
                	}
                	
            	}
            },
            
            toggleCustomDateTimeFormat: function(e){
            	var choice = this.$("select.datetime-string").val();
            	
            	if(choice == "custom"){
            		this.$(".datetime-string-custom-container").show();
            	}
            	else{
            		this.$(".datetime-string-custom-container").hide();
            	}
            		
            },
            
            chooseNonNumericDomain: function(){
            	
            	if(this.model.get("nonNumericDomain") && this.model.get("nonNumericDomain").length){
            		
            		//Hide all the details first
            		this.$(".non-numeric-domain-type").hide();
            		
            		//Get the domain from the model
            		var domain = this.model.get("nonNumericDomain")[0];
            		
            		//If the domain type is text, select it and show it
            		if( domain.textDomain ){
            			
            			//If the pattern is just a wildcard, then check the "anything" radio button
            			if(domain.textDomain.pattern && domain.textDomain.pattern.length && domain.textDomain.pattern[0] == "*")
            				this.$("." + this.model.get("measurementScale") + "-options .possible-text[value='anything']").prop("checked", true);            				
            			//Otherwise, check the pattern radio button
            			else{
            				this.$("." + this.model.get("measurementScale") + "-options .possible-text[value='pattern']").prop("checked", true);
            				this.$("." + this.model.get("measurementScale") + "-options .non-numeric-domain-type.pattern").show();
            			}
            			
            		}
            		//If the domain type is a code list, select it and show it
            		else if( domain.enumeratedDomain ){
            			this.$("." + this.model.get("measurementScale") + "-options .possible-text[value='enumeratedDomain']").attr("checked", "checked");
            			this.$(".non-numeric-domain-type.enumeratedDomain").show();
            		}
            	}
            },
            
            toggleNonNumericDomain: function(){
            	//Hide the domain type details
        		this.$(".non-numeric-domain-type").hide();
        		
        		//Get the new value selected
            	var value = this.$(".non-numeric-domain .possible-text:checked").val();
            	
            	var activeScale = this.$(".nominal-options").is(":visible")? "nominal" : "ordinal";
            	
            	//Show the form elements for that non numeric type
            	this.$("." + activeScale + "-options .non-numeric-domain-type." + value).show();
            	
            },
            
            addNewCodeRow: function(e){
            	var $row 	   = $(e.target).parents(".code-row"),
            		code 	   = $row.find(".code").val(),
            		definition = $row.find(".definition").val();
            	
            	//Only add a row when there is a value for the code and code definition
            	if(!code || !definition) return false;
            	
            	$row.removeClass("new");
            	this.addCodeRow();            	
            },
            
            addCodeRow: function(scaleType){
            	if(!scaleType)
            		var scaleType = this.model.get("measurementScale");
            	
        		var	$container = this.$("." + scaleType + "-options .enumeratedDomain.non-numeric-domain-type .table");
            	
            	//Add an empty row at the end to add a new code
            	var row = $(document.createElement("tr"))
	            			.addClass("code-row new")
	            			.append(
	    					$(document.createElement("td")).addClass("span2").append( 
	    							$(document.createElement("input"))
	    								.addClass("full-width codelist code")
	    								.attr("type", "text")
	    								.attr("data-category", "code")
	    								.attr("placeholder", "Code value allowed (e.g. \"site A\")")),
							$(document.createElement("td")).addClass("span10").append( 
	    							$(document.createElement("input"))
	    								.addClass("full-width codelist definition")
	    								.attr("type", "text")
	    								.attr("data-category", "codeDefinition")
	    								.attr("placeholder", "Definition of this code")));
            	
            	$container.append(row);
            }
        });
        
        return EMLMeasurementScaleView;
});