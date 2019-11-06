define(["jquery",
    "underscore",
    "backbone",
    "collections/Filters",
    "views/portals/PortalSectionView",
    "views/DataCatalogViewWithFilters",
    "views/filters/FilterGroupsView"],
    function($, _, Backbone, Filters, PortalSectionView, DataCatalogView, FilterGroupsView){

    /* The PortalDataView is a view to render the
     * portal data tab (within PortalView) to display all the datasets related to this portal.
     */
      var PortalDataView = PortalSectionView.extend({

        tagName: "div",

        // @type {PortalModel} - The Portal associated with this view
        model: null,

        // @type Array - An array of subviews in this view
        subviews: [],

        /**
        * The display name for this Section
        * @type {string}
        */
        uniqueSectionLabel: "Data",

        render: function(){

          if( this.id ){
            this.$el.attr("id", this.id);
          }

          var searchResults;
          var searchModel = this.model.get("searchModel");

          //Set some options on the searchResults
          searchResults = this.model.get("searchResults");
          //Get the documents values as a facet so we can get all the data object IDs
          searchResults.facet = ["documents", "id"];
          //Retrieve only 5 result rows
          searchResults.rows = 25;

          //Hide the Filters that are part of the Collection definition.
          var searchFilters = this.model.get("searchModel").get("filters");
          searchFilters.each(function(searchFilter){
            //Check if this Filter model is also part of the definition filters collection
            if( this.model.get("definitionFilters").contains(searchFilter) ){
              searchFilter.set("isInvisible", true);
            }
          }, this);

          //Render the filters
          var filterGroupsView = new FilterGroupsView({
            filterGroups: this.model.get("filterGroups"),
            filters: this.model.get("searchModel").get("filters")
          });

          this.$el.append(filterGroupsView.el);
          filterGroupsView.render();
          this.subviews.push(filterGroupsView);

          //Create a DataCatalogView
          var dataCatalogView = new DataCatalogView({
            mode: "map",
            searchModel: this.model.get("searchModel"),
            searchResults: searchResults,
            mapModel: this.model.get("mapModel"),
            isSubView: true,
            filters: false,
            fixedHeight: true,
            filterGroupsView: filterGroupsView
          });

          this.$el.append(dataCatalogView.el);
          this.$el.data("view", this);

          dataCatalogView.render();

        }

     });

     return PortalDataView;
});
